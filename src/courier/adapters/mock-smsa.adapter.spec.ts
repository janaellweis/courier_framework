import { MockSmsaAdapter } from './mock-smsa.adapter';
import { ShipmentStatus } from '../types/shipment-status.enum';

describe('MockSmsaAdapter', () => {
  let adapter: MockSmsaAdapter;

  beforeEach(() => {
    adapter = new MockSmsaAdapter();
  });

  it('should create a waybill with CREATED status', async () => {
    const result = await adapter.createWaybill({
      orderNumber: 'ORDER-3003',
      sender: {
        name: 'Ahmed',
        phone: '0501234567',
        address: {
          city: 'Riyadh',
          street: 'King Fahd Road',
          country: 'Saudi Arabia',
        },
      },
      recipient: {
        name: 'Sara',
        phone: '0551234567',
        address: {
          city: 'Jeddah',
          street: 'Tahlia Street',
          country: 'Saudi Arabia',
        },
      },
      packages: [{ weightKg: 2.5 }],
    });

    expect(result).toEqual({
      waybillId: 'ORDER-3003',
      trackingNumber: 'SMSA-ORDER-3003',
      status: ShipmentStatus.CREATED,
    });
  });
it('should map SMSA tracking status to IN_TRANSIT', async () => {
  const status = await adapter.trackShipment('ORDER-3003');

  expect(status).toBe(ShipmentStatus.IN_TRANSIT);
});

it('should return CANCELLED after cancelling a shipment', async () => {
  await adapter.cancelShipment('ORDER-3003');

  const status = await adapter.trackShipment('ORDER-3003');

  expect(status).toBe(ShipmentStatus.CANCELLED);
});
});