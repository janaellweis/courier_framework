
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CourierService } from './courier.service';
import { CourierRegistry } from './courier.registry';
import { PrismaService } from '../prisma/prisma.service';
import { MockAramexAdapter } from './adapters/mock-aramex.adapter';
import { MockSmsaAdapter } from './adapters/mock-smsa.adapter';
import { ShipmentStatus } from './types/shipment-status.enum';

describe('CourierService', () => {
  let service: CourierService;

  beforeEach(() => {
    const aramex = new MockAramexAdapter();

    const registry = {
      getCourier: jest.fn().mockReturnValue(aramex),
    } as unknown as CourierRegistry;

    const prisma = {} as PrismaService;

    service = new CourierService(registry, prisma);
  });

  // Test 1: Aramex does not support cancellation.
  it('should reject cancellation when the courier does not support it', async () => {
    await expect(
      service.cancelShipment('ARAMEX', 'ARX-ORDER-4004'),
    ).rejects.toThrow(BadRequestException);
  });

  // Test 2: Shipment does not exist in PostgreSQL.
  it('should reject cancellation when the shipment does not exist', async () => {
    const smsa = new MockSmsaAdapter();

    const registry = {
      getCourier: jest.fn().mockReturnValue(smsa),
    } as unknown as CourierRegistry;

    const findFirst = jest.fn().mockResolvedValue(null);

    const prisma = {
      shipment: {
        findFirst,
      },
    } as unknown as PrismaService;

    const testService = new CourierService(registry, prisma);

    await expect(
      testService.cancelShipment('SMSA', 'DOES-NOT-EXIST'),
    ).rejects.toThrow(NotFoundException);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        courier: 'SMSA',
        waybillId: 'DOES-NOT-EXIST',
      },
    });
  });

  // Test 3: Cancelled shipments must stay cancelled.
  it('should keep a cancelled shipment as CANCELLED when tracked', async () => {
    const smsa = new MockSmsaAdapter();
    const trackSpy = jest.spyOn(smsa, 'trackShipment');

    const registry = {
      getCourier: jest.fn().mockReturnValue(smsa),
    } as unknown as CourierRegistry;

    const findFirst = jest.fn().mockResolvedValue({
      id: 1,
      courier: 'SMSA',
      waybillId: 'ORDER-3003',
      status: ShipmentStatus.CANCELLED,
    });

    const update = jest.fn();

    const prisma = {
      shipment: {
        findFirst,
        update,
      },
    } as unknown as PrismaService;

    const testService = new CourierService(registry, prisma);

    const status = await testService.trackShipment(
      'SMSA',
      'ORDER-3003',
    );

    expect(status).toBe(ShipmentStatus.CANCELLED);
    expect(trackSpy).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  // Test 4: Duplicate waybills should return 409 Conflict.
  it('should return ConflictException when a duplicate waybill is saved', async () => {
    const smsa = new MockSmsaAdapter();

    const registry = {
      getCourier: jest.fn().mockReturnValue(smsa),
    } as unknown as CourierRegistry;

    // Simulate Prisma's unique constraint error (P2002).
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '6.19.3',
      },
    );

    const create = jest.fn().mockRejectedValue(duplicateError);

    const prisma = {
      shipment: {
        create,
      },
    } as unknown as PrismaService;

    const testService = new CourierService(registry, prisma);

    const request = {
      orderNumber: 'ORDER-1001',
      sender: {
        name: 'Sender',
        phone: '0500000000',
        address: {
          city: 'Riyadh',
          street: 'Main Street',
          country: 'SA',
        },
      },
      recipient: {
        name: 'Recipient',
        phone: '0511111111',
        address: {
          city: 'Jeddah',
          street: 'Second Street',
          country: 'SA',
        },
      },
      packages: [
        {
          weightKg: 2,
        },
      ],
    };

    await expect(
      testService.createWaybill('SMSA', request),
    ).rejects.toThrow(ConflictException);

    expect(create).toHaveBeenCalledTimes(1);
  });
  // Test 5: Delivered shipments must stay delivered.
it('should keep a delivered shipment as DELIVERED when tracked', async () => {
  const smsa = new MockSmsaAdapter();
  const trackSpy = jest.spyOn(smsa, 'trackShipment');

  const registry = {
    getCourier: jest.fn().mockReturnValue(smsa),
  } as unknown as CourierRegistry;

  // Simulate a shipment already delivered in PostgreSQL.
  const findFirst = jest.fn().mockResolvedValue({
    id: 2,
    courier: 'SMSA',
    waybillId: 'ORDER-5005',
    status: ShipmentStatus.DELIVERED,
  });

  const update = jest.fn();

  const prisma = {
    shipment: {
      findFirst,
      update,
    },
  } as unknown as PrismaService;

  const testService = new CourierService(registry, prisma);

  const status = await testService.trackShipment(
    'SMSA',
    'ORDER-5005',
  );

  expect(status).toBe(ShipmentStatus.DELIVERED);
  expect(trackSpy).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});
it('should reject cancellation of a delivered shipment', async () => {
  const smsa = new MockSmsaAdapter();
  const cancelSpy = jest.spyOn(smsa, 'cancelShipment');

  const registry = {
    getCourier: jest.fn().mockReturnValue(smsa),
  } as unknown as CourierRegistry;

  const findFirst = jest.fn().mockResolvedValue({
    id: 3,
    courier: 'SMSA',
    waybillId: 'ORDER-6006',
    status: ShipmentStatus.DELIVERED,
  });

  const update = jest.fn();

  const prisma = {
    shipment: {
      findFirst,
      update,
    },
  } as unknown as PrismaService;

  const testService = new CourierService(registry, prisma);

  await expect(
    testService.cancelShipment('SMSA', 'ORDER-6006'),
  ).rejects.toThrow(BadRequestException);

  expect(cancelSpy).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});
});
