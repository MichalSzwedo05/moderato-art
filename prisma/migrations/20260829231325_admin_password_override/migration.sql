-- CreateTable
CREATE TABLE "AdminPassword" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(2048) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminPassword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPassword_username_key" ON "AdminPassword"("username");
