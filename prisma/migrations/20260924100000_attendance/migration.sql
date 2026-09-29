CREATE TABLE "AttendanceActivity" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceParticipant" (
    "activityId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceParticipant_pkey" PRIMARY KEY ("activityId", "submissionId")
);

CREATE INDEX "AttendanceActivity_activityDate_startsAt_idx" ON "AttendanceActivity"("activityDate", "startsAt");
CREATE INDEX "AttendanceActivity_updatedAt_idx" ON "AttendanceActivity"("updatedAt");
CREATE INDEX "AttendanceParticipant_submissionId_activityId_idx" ON "AttendanceParticipant"("submissionId", "activityId");

ALTER TABLE "AttendanceParticipant" ADD CONSTRAINT "AttendanceParticipant_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "AttendanceActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceParticipant" ADD CONSTRAINT "AttendanceParticipant_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "ContactSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
