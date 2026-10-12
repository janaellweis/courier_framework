import { Injectable } from '@nestjs/common';
import { Courier } from '../interfaces/courier.interface';
import {
  CreateWaybillRequest,
  CreateWaybillResponse,
} from '../types/shipment.types';
import { ShipmentStatus } from '../types/shipment-status.enum';

@Injectable()
export class MockAramexAdapter implements Courier {
  async createWaybill(
    request: CreateWaybillRequest,
  ): Promise<CreateWaybillResponse> {
    return {
      waybillId: `ARX-${request.orderNumber}`,
      trackingNumber: `ARAMEX-${request.orderNumber}`,
      status: ShipmentStatus.CREATED,
    };
  }

  async getWaybillLabel(waybillId: string): Promise<string> {
  const safeWaybillId = waybillId.replace(
    /[&<>"']/g,
    (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[character];
    },
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Aramex Shipping Label</title>
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
        </style>
      </head>
      <body>
        <div class="label">
          <h2>Aramex Shipping Label</h2>
          <p><strong>Courier:</strong> Aramex</p>
          <p><strong>Waybill ID:</strong> ${safeWaybillId}</p>
          <p><strong>Status:</strong> CREATED</p>
        </div>
      </body>
    </html>
  `;
}

  private mapStatus(courierStatus: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      SHIPMENT_CREATED: ShipmentStatus.CREATED,
      SHIPMENT_COLLECTED: ShipmentStatus.PICKED_UP,
      SHIPMENT_MOVING: ShipmentStatus.IN_TRANSIT,
      SHIPMENT_DELIVERED: ShipmentStatus.DELIVERED,
    };

    return statusMap[courierStatus] ?? ShipmentStatus.UNKNOWN;
  }

 async trackShipment(_waybillId: string): Promise<ShipmentStatus> {
    const courierStatus = 'SHIPMENT_MOVING'; // Simulated response

    return this.mapStatus(courierStatus);
  }
}