-- CreateTable
CREATE TABLE "EmployeeDirectAllocationConfig" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payPeriodId" TEXT NOT NULL,
    "allocation" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDirectAllocationConfig_id_key" ON "EmployeeDirectAllocationConfig"("id");

-- AddForeignKey
ALTER TABLE "EmployeeDirectAllocationConfig" ADD CONSTRAINT "EmployeeDirectAllocationConfig_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDirectAllocationConfig" ADD CONSTRAINT "EmployeeDirectAllocationConfig_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
