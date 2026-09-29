ALTER TABLE "AttendanceActivity" ADD COLUMN "invalid" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX "AttendanceActivity_name_activityDate_key";

CREATE UNIQUE INDEX "AttendanceActivity_name_activityDate_key"
  ON "AttendanceActivity"("name", "activityDate")
  WHERE "invalid" = false;
