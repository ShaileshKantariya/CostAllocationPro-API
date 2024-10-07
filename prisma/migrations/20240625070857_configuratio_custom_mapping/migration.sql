-- CreateTable
CREATE TABLE "ConfigurationCustomRules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "payPeriodId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationCustomRules_id_key" ON "ConfigurationCustomRules"("id");

-- AddForeignKey
ALTER TABLE "ConfigurationCustomRules" ADD CONSTRAINT "ConfigurationCustomRules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationCustomRules" ADD CONSTRAINT "ConfigurationCustomRules_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
