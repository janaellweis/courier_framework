import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
} from '@nestjs/common';

import { CourierService } from './courier.service';
import { CreateWaybillDto } from './dto/create-waybill.dto';

@Controller('couriers')
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  // 1. Create a waybill
  @Post(':courierName/waybills')
createWaybill(
  @Param('courierName') courierName: string,
  @Body() request: CreateWaybillDto,
) {
  return this.courierService.createWaybill(courierName, request);
}

  // 2. Track a shipment
  @Get(':courierName/waybills/:waybillId/tracking')
  trackShipment(
    @Param('courierName') courierName: string,
    @Param('waybillId') waybillId: string,
  ) {
    return this.courierService.trackShipment(courierName, waybillId);
  }

  // 3. Get a printable waybill label
  @Get(':courierName/waybills/:waybillId/label')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getWaybillLabel(
    @Param('courierName') courierName: string,
    @Param('waybillId') waybillId: string,
  ) {
    return this.courierService.getWaybillLabel(courierName, waybillId);
  }

  // 4. Cancel a shipment (if the courier supports cancellation)
  @Delete(':courierName/waybills/:waybillId')
  cancelShipment(
    @Param('courierName') courierName: string,
    @Param('waybillId') waybillId: string,
  ) {
    return this.courierService.cancelShipment(courierName, waybillId);
  }
}
