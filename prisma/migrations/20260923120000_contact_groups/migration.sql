CREATE TABLE "ContactGroup" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactGroupMembership" (
    "groupId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactGroupMembership_pkey" PRIMARY KEY ("groupId", "submissionId")
);

CREATE UNIQUE INDEX "ContactGroup_name_key" ON "ContactGroup"("name");
CREATE INDEX "ContactGroupMembership_submissionId_groupId_idx" ON "ContactGroupMembership"("submissionId", "groupId");

ALTER TABLE "ContactGroupMembership" ADD CONSTRAINT "ContactGroupMembership_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactGroupMembership" ADD CONSTRAINT "ContactGroupMembership_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "ContactSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
