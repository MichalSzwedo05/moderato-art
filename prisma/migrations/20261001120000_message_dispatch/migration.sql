CREATE TABLE "MessageDispatch" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "channel" VARCHAR(5) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "recipients" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageDispatch_key_key" ON "MessageDispatch"("key");
CREATE INDEX "MessageDispatch_expiresAt_idx" ON "MessageDispatch"("expiresAt");
CREATE INDEX "MessageDispatch_status_idx" ON "MessageDispatch"("status");
