ALTER TABLE "ContactSubmission"
  ALTER COLUMN "parentName" DROP NOT NULL,
  ADD COLUMN "childName" VARCHAR(120),
  ADD COLUMN "birthDate" VARCHAR(20),
  ADD COLUMN "preschool" VARCHAR(200),
  ADD COLUMN "group" VARCHAR(100),
  ADD COLUMN "address" VARCHAR(300),
  ADD COLUMN "paymentAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "imageConsent" VARCHAR(30);
