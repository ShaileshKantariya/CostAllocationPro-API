/*
  Warnings:

  - Added the required column `companyId` to the `SyncLogs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SyncLogs" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SyncLogs" ADD CONSTRAINT "SyncLogs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
