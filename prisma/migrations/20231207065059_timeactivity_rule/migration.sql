-- AlterTable
ALTER TABLE "SplitTimeActivities" ADD COLUMN     "customRuleId" TEXT,
ADD COLUMN     "isAutoSplit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isClassReadOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCustomerReadOnly" BOOLEAN NOT NULL DEFAULT false;
