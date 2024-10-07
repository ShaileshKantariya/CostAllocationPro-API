-- AlterTable
ALTER TABLE "TimeActivities" ADD COLUMN     "customRuleId" TEXT,
ADD COLUMN     "isCustomRuleApplied" BOOLEAN NOT NULL DEFAULT false;
