/*
  Warnings:

  - Changed the type of `allocation` on the `EmployeeDirectAllocationConfig` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "EmployeeDirectAllocationConfig" DROP COLUMN "allocation",
ADD COLUMN     "allocation" DOUBLE PRECISION NOT NULL;
