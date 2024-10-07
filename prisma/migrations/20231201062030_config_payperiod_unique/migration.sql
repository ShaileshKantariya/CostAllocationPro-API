/*
  Warnings:

  - A unique constraint covering the columns `[companyId,payPeriodId]` on the table `Configuration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Configuration_companyId_payPeriodId_key" ON "Configuration"("companyId", "payPeriodId");
