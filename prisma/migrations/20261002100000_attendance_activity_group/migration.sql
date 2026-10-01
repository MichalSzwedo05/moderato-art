ALTER TABLE "AttendanceActivity" ADD COLUMN "groupId" VARCHAR(64);

CREATE INDEX "AttendanceActivity_groupId_idx" ON "AttendanceActivity"("groupId");

ALTER TABLE "AttendanceActivity" ADD CONSTRAINT "AttendanceActivity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
