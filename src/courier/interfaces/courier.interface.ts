import {
  CreateWaybillRequest,
  CreateWaybillResponse,
} from '../types/shipment.types';
import { ShipmentStatus } from '../types/shipment-status.enum';

export interface Courier {
  createWaybill(
    request: CreateWaybillRequest,
  ): Promise<CreateWaybillResponse>;

  getWaybillLabel(waybillId: string): Promise<string>;

  trackShipment(waybillId: string): Promise<ShipmentStatus>;
}