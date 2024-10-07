-- CreateTable
CREATE TABLE "TimelogMappingHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "mappingData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelogMappingHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TimelogMappingHistory" ADD CONSTRAINT "TimelogMappingHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
