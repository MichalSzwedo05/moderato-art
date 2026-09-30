ALTER TABLE "AttendanceActivity" ADD COLUMN "seriesId" VARCHAR(64);

CREATE INDEX "AttendanceActivity_seriesId_activityDate_idx" ON "AttendanceActivity"("seriesId", "activityDate");
