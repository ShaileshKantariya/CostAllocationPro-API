/*
  Warnings:

  - You are about to drop the column `isFaild` on the `Migrations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Migrations" DROP COLUMN "isFaild",
ADD COLUMN     "isFailed" BOOLEAN NOT NULL DEFAULT false;
