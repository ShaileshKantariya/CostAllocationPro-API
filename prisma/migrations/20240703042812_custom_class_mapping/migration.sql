-- CreateTable
CREATE TABLE "customClassMapping" (
    "id" TEXT NOT NULL,
    "classMapping" JSONB,
    "payPeriodId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "customClassMapping_id_key" ON "customClassMapping"("id");

-- AddForeignKey
ALTER TABLE "customClassMapping" ADD CONSTRAINT "customClassMapping_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customClassMapping" ADD CONSTRAINT "customClassMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
