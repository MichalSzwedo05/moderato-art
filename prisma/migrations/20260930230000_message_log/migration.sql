CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "channel" VARCHAR(5) NOT NULL,
    "message" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "subject" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");
