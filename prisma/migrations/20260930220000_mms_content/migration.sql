CREATE TABLE "MmsContent" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MmsContent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MmsContent_expiresAt_idx" ON "MmsContent"("expiresAt");
