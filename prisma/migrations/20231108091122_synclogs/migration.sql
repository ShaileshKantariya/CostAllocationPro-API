-- CreateTable
CREATE TABLE "SyncLogs" (
    "id" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncLogs_pkey" PRIMARY KEY ("id")
);
