-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "decimalToFixedAmount" INTEGER DEFAULT 2,
ADD COLUMN     "decimalToFixedPercentage" INTEGER DEFAULT 4;
