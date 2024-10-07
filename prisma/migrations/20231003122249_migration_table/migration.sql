-- CreateTable
CREATE TABLE "Migrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "runOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Migrations_pkey" PRIMARY KEY ("id")
);
