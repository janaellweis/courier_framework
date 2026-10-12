
import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Courier } from '../interfaces/courier.interface';
import {
  CreateWaybillRequest,
  CreateWaybillResponse,
} from '../types/shipment.types';
import { ShipmentStatus } from '../types/shipment-status.enum';

@Injectable()
export class HttpCourierAdapter implements Courier {
  private readonly baseUrl = 'http://localhost:3001';
  private readonly timeoutMs = 5000;

  // Retry temporary failures, up to 3 attempts total.
  private async withRetry<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        const retryable =
          axiosError.code === 'ECONNABORTED' ||
          axiosError.code === 'ETIMEDOUT' ||
          axiosError.code === 'ECONNRESET' ||
          status === 429 ||
          (status !== undefined && status >= 500);

        if (!retryable || attempt === maxAttempts) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 500 * attempt),
        );
      }
    }

    throw new Error('HTTP request failed');
  }

  // Convert courier API errors into meaningful NestJS errors.
  private handleHttpError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT'
      ) {
        throw new GatewayTimeoutException(
          'Courier API timed out',
        );
      }

      if (status === 404) {
        throw new HttpException(
          'Courier waybill not found',
          404,
        );
      }

      if (status === 409) {
        throw new HttpException(
          'Courier waybill already exists',
          409,
        );
      }

      throw new BadGatewayException(
        'Courier API request failed',
      );
    }

    throw error;
  }

  // Create a waybill (no automatic retries).
  async createWaybill(
    request: CreateWaybillRequest,
  ): Promise<CreateWaybillResponse> {
    try {
      const response = await axios.post<CreateWaybillResponse>(
        `${this.baseUrl}/waybills`,
        request,
        { timeout: this.timeoutMs },
      );

      return response.data;
    } catch (error) {
      this.handleHttpError(error);
    }
  }

  // Retrieve a shipping label with retries.
  async getWaybillLabel(waybillId: string): Promise<string> {
    try {
      const response = await this.withRetry(() =>
        axios.get<string>(
          `${this.baseUrl}/waybills/${encodeURIComponent(waybillId)}/label`,
          { timeout: this.timeoutMs },
        ),
      );

      return response.data;
    } catch (error) {
      this.handleHttpError(error);
    }
  }

  // Track a shipment with retries.
  async trackShipment(waybillId: string): Promise<ShipmentStatus> {
    try {
      const response = await this.withRetry(() =>
        axios.get<{ status: ShipmentStatus }>(
          `${this.baseUrl}/waybills/${encodeURIComponent(waybillId)}/tracking`,
          { timeout: this.timeoutMs },
        ),
      );

      return response.data.status;
    } catch (error) {
      this.handleHttpError(error);
    }
  }
}
