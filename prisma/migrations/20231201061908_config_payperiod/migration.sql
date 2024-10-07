-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "payPeriodId" TEXT;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
