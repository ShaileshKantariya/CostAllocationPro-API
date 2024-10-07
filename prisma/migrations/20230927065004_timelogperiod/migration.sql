-- AlterTable
ALTER TABLE "TimeActivities" ADD COLUMN     "payPeriodId" TEXT;

-- AddForeignKey
ALTER TABLE "TimeActivities" ADD CONSTRAINT "TimeActivities_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
