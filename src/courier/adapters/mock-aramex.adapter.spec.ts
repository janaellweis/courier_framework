import { MockAramexAdapter } from './mock-aramex.adapter';
import { ShipmentStatus } from '../types/shipment-status.enum';

describe('MockAramexAdapter', () => {
  let adapter: MockAramexAdapter;

  beforeEach(() => {
    adapter = new MockAramexAdapter();
  });

  it('should create an Aramex waybill', async () => {
    const result = await adapter.createWaybill({
      orderNumber: 'ORDER-4004',
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
      waybillId: 'ARX-ORDER-4004',
      trackingNumber: 'ARAMEX-ORDER-4004',
      status: ShipmentStatus.CREATED,
    });
  });

  it('should map Aramex tracking status to IN_TRANSIT', async () => {
    const status = await adapter.trackShipment('ARX-ORDER-4004');

    expect(status).toBe(ShipmentStatus.IN_TRANSIT);
  });
});
