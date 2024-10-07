/*
  Warnings:

  - You are about to drop the column `SubmitedOn` on the `TimeSheets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[payPeriodId]` on the table `TimeSheets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `payPeriodId` to the `TimeSheets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submitedOn` to the `TimeSheets` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `TimeSheets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "TimeActivities" ADD COLUMN     "timeSheetId" TEXT;

-- AlterTable
ALTER TABLE "TimeSheets" DROP COLUMN "SubmitedOn",
ADD COLUMN     "payPeriodId" TEXT NOT NULL,
ADD COLUMN     "submitedOn" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TimeSheetsStatus";

-- CreateIndex
CREATE UNIQUE INDEX "TimeSheets_payPeriodId_key" ON "TimeSheets"("payPeriodId");

-- AddForeignKey
ALTER TABLE "TimeActivities" ADD CONSTRAINT "TimeActivities_timeSheetId_fkey" FOREIGN KEY ("timeSheetId") REFERENCES "TimeSheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSheets" ADD CONSTRAINT "TimeSheets_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
