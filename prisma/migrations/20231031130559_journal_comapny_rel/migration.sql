-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "companyId" TEXT;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
