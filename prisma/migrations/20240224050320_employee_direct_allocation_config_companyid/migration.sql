/*
  Warnings:

  - Added the required column `companyId` to the `EmployeeDirectAllocationConfig` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeeDirectAllocationConfig" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "EmployeeDirectAllocationConfig" ADD CONSTRAINT "EmployeeDirectAllocationConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
