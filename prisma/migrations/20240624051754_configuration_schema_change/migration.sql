-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "isClassRequiredForJournal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isCustomerRequiredForJournal" BOOLEAN NOT NULL DEFAULT true;
