-- AlterTable
ALTER TABLE "EmployeeDirectAllocationConfig" ALTER COLUMN "classId" DROP NOT NULL,
ALTER COLUMN "className" DROP NOT NULL,
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "customerName" DROP NOT NULL;
