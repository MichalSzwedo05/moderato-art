CREATE TABLE "AttendanceActivityGroup" (
    "activityId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceActivityGroup_pkey" PRIMARY KEY ("activityId", "groupId")
);

CREATE INDEX "AttendanceActivityGroup_groupId_activityId_idx" ON "AttendanceActivityGroup"("groupId", "activityId");

ALTER TABLE "AttendanceActivityGroup" ADD CONSTRAINT "AttendanceActivityGroup_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "AttendanceActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceActivityGroup" ADD CONSTRAINT "AttendanceActivityGroup_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AttendanceActivityGroup" ("activityId", "groupId")
SELECT "id", "groupId"
FROM "AttendanceActivity"
WHERE "groupId" IS NOT NULL;
