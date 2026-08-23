ALTER TABLE "ContactSubmission"
ADD COLUMN "privacyNoticeVersion" VARCHAR(40),
ADD COLUMN "privacyNoticeAcknowledgedAt" TIMESTAMP(3);

UPDATE "ContactSubmission"
SET "deleteAfter" = "retentionAnchorAt" + INTERVAL '12 months'
WHERE "deleteAfter" IS NULL;
