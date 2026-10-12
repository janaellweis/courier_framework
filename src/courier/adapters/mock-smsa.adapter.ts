import { Injectable } from '@nestjs/common';
import { CancellableCourier } from '../interfaces/cancellable-courier.interface';
import {
  CreateWaybillRequest,
  CreateWaybillResponse,
} from '../types/shipment.types';
import { ShipmentStatus } from '../types/shipment-status.enum';

@Injectable()
export class MockSmsaAdapter implements CancellableCourier {
  private readonly cancelledWaybills = new Set<string>();
  async createWaybill(
    request: CreateWaybillRequest,
  ): Promise<CreateWaybillResponse> {
    this.cancelledWaybills.delete(request.orderNumber);
    return {
      waybillId: request.orderNumber,
      trackingNumber: `SMSA-${request.orderNumber}`,
      status: ShipmentStatus.CREATED,
    };
  }

 async getWaybillLabel(waybillId: string): Promise<string> {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SMSA Shipping Label</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 30px;
          }

          .label {
            border: 2px solid black;
            padding: 20px;
            width: 350px;
          }

          h2 {
            margin-top: 0;
          }

          .tracking {
            font-size: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="label">
          <h2>SMSA Shipping Label</h2>
          <p>Waybill ID: ${waybillId}</p>
          <p class="tracking">Tracking: SMSA-${waybillId}</p>
          <p>Courier: SMSA</p>
        </div>
      </body>
    </html>
  `;
}

  private mapStatus(courierStatus: string): ShipmentStatus {
  const statusMap: Record<string, ShipmentStatus> = {
    'Shipment Created': ShipmentStatus.CREATED,
    'Picked Up': ShipmentStatus.PICKED_UP,
    'On the Way': ShipmentStatus.IN_TRANSIT,
    'Delivered': ShipmentStatus.DELIVERED,
  };

  return statusMap[courierStatus] ?? ShipmentStatus.UNKNOWN;
}
 async trackShipment(waybillId: string): Promise<ShipmentStatus> {
  if (this.cancelledWaybills.has(waybillId)) {
    return ShipmentStatus.CANCELLED;
  }

  const courierStatus = 'On the Way';
  return this.mapStatus(courierStatus);
}

  async cancelShipment(waybillId: string): Promise<void> {
  this.cancelledWaybills.add(waybillId);
}
}