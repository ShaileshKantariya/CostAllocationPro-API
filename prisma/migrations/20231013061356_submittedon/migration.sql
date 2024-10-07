/*
  Warnings:

  - You are about to drop the column `submitedOn` on the `TimeSheets` table. All the data in the column will be lost.
  - Added the required column `submittedOn` to the `TimeSheets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TimeSheets" DROP COLUMN "submitedOn",
ADD COLUMN     "submittedOn" TIMESTAMP(3) NOT NULL;
