-- CreateEnum
CREATE TYPE "TriggerProcess" AS ENUM ('add', 'edit', 'split', 'delete');

-- CreateTable
CREATE TABLE "CustomRules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "triggerProcess" "TriggerProcess" NOT NULL DEFAULT 'split',
    "criteria" JSONB NOT NULL,
    "actions" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomRules_id_key" ON "CustomRules"("id");

-- AddForeignKey
ALTER TABLE "CustomRules" ADD CONSTRAINT "CustomRules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
