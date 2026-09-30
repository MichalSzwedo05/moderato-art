CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" VARCHAR(3) NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SmsMessage_createdAt_idx" ON "SmsMessage"("createdAt");
