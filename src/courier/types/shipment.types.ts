import { ShipmentStatus } from './shipment-status.enum';
export interface Address {
  city: string;
  street: string;
  country: string;
}

export interface Contact {
  name: string;
  phone: string;
  address: Address;
}

export interface Package {
  weightKg: number;
}

export interface CreateWaybillRequest {
  orderNumber: string;
  sender: Contact;
  recipient: Contact;
  packages: Package[];
}
export interface CreateWaybillResponse {
  waybillId: string;
  trackingNumber: string;
  status: ShipmentStatus;
}
