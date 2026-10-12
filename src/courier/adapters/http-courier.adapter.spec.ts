
import axios from 'axios';
import { HttpCourierAdapter } from './http-courier.adapter';
import { ShipmentStatus } from '../types/shipment-status.enum';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpCourierAdapter', () => {
  let adapter: HttpCourierAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAxios.isAxiosError.mockImplementation(
      (error: unknown) =>
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        error.isAxiosError === true,
    );

    adapter = new HttpCourierAdapter();
  });

  it('retries tracking after a temporary 503 failure', async () => {
    mockedAxios.get
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 503 },
      })
      .mockResolvedValueOnce({
        data: { status: ShipmentStatus.IN_TRANSIT },
      });

    const status = await adapter.trackShipment('HTTP-ORDER-2002');

    expect(status).toBe(ShipmentStatus.IN_TRANSIT);
    expect(mockedAxios.get.mock.calls).toHaveLength(2);
  });

  it('does not retry tracking after a 400 error', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400 },
    });

    await expect(
      adapter.trackShipment('HTTP-ORDER-2002'),
    ).rejects.toMatchObject({
      status: 502,
    });

expect(mockedAxios.get.mock.calls).toHaveLength(1);
  });

  it('retries tracking after a timeout', async () => {
    mockedAxios.get
      .mockRejectedValueOnce({
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      })
      .mockResolvedValueOnce({
        data: { status: ShipmentStatus.IN_TRANSIT },
      });

    const status = await adapter.trackShipment('HTTP-ORDER-2002');

    expect(status).toBe(ShipmentStatus.IN_TRANSIT);
expect(mockedAxios.get.mock.calls).toHaveLength(2);
  });

  it('returns 404 when the courier waybill does not exist', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });

    await expect(
      adapter.getWaybillLabel('HTTP-DOES-NOT-EXIST'),
    ).rejects.toMatchObject({
      status: 404,
      response: 'Courier waybill not found',
    });

expect(mockedAxios.get.mock.calls).toHaveLength(1);
  });
});
