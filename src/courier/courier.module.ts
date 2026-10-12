import { Module } from '@nestjs/common';
import { CourierRegistry } from './courier.registry';
import { MockSmsaAdapter } from './adapters/mock-smsa.adapter';
import { MockAramexAdapter } from './adapters/mock-aramex.adapter';
import { CourierService } from './courier.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CourierController } from './courier.controller';
import { HttpCourierAdapter } from './adapters/http-courier.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [CourierController],
  providers: [
    MockSmsaAdapter,
    MockAramexAdapter,
    CourierRegistry,
    CourierService,
    HttpCourierAdapter,
  ],
  exports: [CourierService],
})
export class CourierModule {}