
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CourierRegistry } from './courier.registry';
import {
  CreateWaybillRequest,
  CreateWaybillResponse,
} from './types/shipment.types';
import { ShipmentStatus } from './types/shipment-status.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CancellableCourier } from './interfaces/cancellable-courier.interface';

@Injectable()
export class CourierService {
  constructor(
    private readonly registry: CourierRegistry,
    private readonly prisma: PrismaService,
  ) {}

  // 1. Create a waybill
  async createWaybill(
    courierName: string,
    request: CreateWaybillRequest,
  ): Promise<CreateWaybillResponse> {
    const courier = this.registry.getCourier(courierName);

    // Ask the courier to create the waybill.
    const result = await courier.createWaybill(request);

    // Save the shipment in PostgreSQL.
    try {
      await this.prisma.shipment.create({
        data: {
          orderNumber: request.orderNumber,
          courier: courierName.toUpperCase(),
          waybillId: result.waybillId,
          trackingNumber: result.trackingNumber,
          status: result.status,
        },
      });
    } catch (error) {
      // P2002 means a unique database constraint was violated.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A shipment with this courier and waybill ID already exists',
        );
      }

      throw error;
    }

    return result;
  }

  // 2. Get a printable waybill label
  async getWaybillLabel(
    courierName: string,
    waybillId: string,
  ): Promise<string> {
    const courier = this.registry.getCourier(courierName);

    // Verify that the shipment exists in PostgreSQL.
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        courier: courierName.toUpperCase(),
        waybillId,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return courier.getWaybillLabel(waybillId);
  }

  // 3. Track a shipment
  async trackShipment(
    courierName: string,
    waybillId: string,
  ): Promise<ShipmentStatus> {
    const courier = this.registry.getCourier(courierName);

    // Find the shipment in PostgreSQL.
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        courier: courierName.toUpperCase(),
        waybillId,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

   // Preserve final shipment statuses.
if (
  shipment.status === ShipmentStatus.CANCELLED ||
  shipment.status === ShipmentStatus.DELIVERED
) {
  return shipment.status as ShipmentStatus;
}
    // Get the latest status from the courier.
    const status = await courier.trackShipment(waybillId);

    // Save the updated status in PostgreSQL.
    await this.prisma.shipment.update({
      where: {
        id: shipment.id,
      },
      data: {
        status,
      },
    });

    return status;
  }

  // 4. Cancel a shipment (optional courier feature)
  async cancelShipment(
    courierName: string,
    waybillId: string,
  ): Promise<{ message: string }> {
    const courier = this.registry.getCourier(courierName);

    // Check whether the courier supports cancellation.
    if (!('cancelShipment' in courier)) {
      throw new BadRequestException(
        `${courierName} does not support cancellation`,
      );
    }

    // Find the shipment in PostgreSQL.
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        courier: courierName.toUpperCase(),
        waybillId,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // Prevent cancelling the same shipment twice.
    if (shipment.status === ShipmentStatus.CANCELLED) {
      throw new BadRequestException(
        'Shipment is already cancelled',
      );
    }
    if (shipment.status === ShipmentStatus.DELIVERED) {
  throw new BadRequestException(
    'A delivered shipment cannot be cancelled',
  );
}

    // Call the courier's cancellation method.
    const cancellableCourier = courier as CancellableCourier;

    await cancellableCourier.cancelShipment(waybillId);

    // Save the cancellation in PostgreSQL.
    await this.prisma.shipment.update({
      where: {
        id: shipment.id,
      },
      data: {
        status: ShipmentStatus.CANCELLED,
      },
    });

    return {
      message: 'Shipment cancelled successfully',
    };
  }
}
