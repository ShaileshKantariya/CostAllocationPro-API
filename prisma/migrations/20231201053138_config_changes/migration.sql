-- AlterTable
ALTER TABLE "ConfigurationSection" ADD COLUMN     "payPeriodId" TEXT;

-- AlterTable
ALTER TABLE "EmployeeCostField" ADD COLUMN     "payPeriodId" TEXT;

-- AlterTable
ALTER TABLE "Field" ADD COLUMN     "payPeriodId" TEXT;

-- AddForeignKey
ALTER TABLE "ConfigurationSection" ADD CONSTRAINT "ConfigurationSection_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCostField" ADD CONSTRAINT "EmployeeCostField_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
