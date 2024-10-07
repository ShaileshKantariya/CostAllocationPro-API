-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "zohoSubscriptionId" TEXT NOT NULL,
    "zohoProductId" TEXT NOT NULL,
    "zohoSubscriptionPlan" JSONB NOT NULL,
    "createdTime" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "addons" JSONB[],
    "expiresAt" TEXT NOT NULL,
    "zohoCustomerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
