/*
  Warnings:

  - A unique constraint covering the columns `[companyId,payPeriodId]` on the table `customClassMapping` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "customClassMapping_companyId_payPeriodId_key" ON "customClassMapping"("companyId", "payPeriodId");
