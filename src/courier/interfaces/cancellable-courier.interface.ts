import { Courier } from './courier.interface';

export interface CancellableCourier extends Courier {
  cancelShipment(waybillId: string): Promise<void>;
}
