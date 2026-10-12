/*
  Warnings:

  - A unique constraint covering the columns `[courier,waybillId]` on the table `Shipment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Shipment_courier_waybillId_key" ON "Shipment"("courier", "waybillId");
