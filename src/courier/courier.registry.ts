import { Injectable, NotFoundException } from '@nestjs/common';
import { Courier } from './interfaces/courier.interface';
import { MockSmsaAdapter } from './adapters/mock-smsa.adapter';
import { MockAramexAdapter } from './adapters/mock-aramex.adapter';
import { HttpCourierAdapter } from './adapters/http-courier.adapter';

@Injectable()
export class CourierRegistry {
  private readonly couriers: Map<string, Courier>;

  constructor(
    private readonly smsa: MockSmsaAdapter,
    private readonly aramex: MockAramexAdapter,
    private readonly httpCourier: HttpCourierAdapter,
  ) {
    this.couriers = new Map<string, Courier>([
      ['SMSA', smsa],
      ['ARAMEX', aramex],
    ]);
    this.couriers.set('HTTP', this.httpCourier);
  }

  getCourier(name: string): Courier {
    const courier = this.couriers.get(name.toUpperCase());

    if (!courier) {
      throw new NotFoundException(`Courier ${name} is not supported`);
    }

    return courier;
  }
}