-- CreateIndex
CREATE INDEX "ContactSubmission_createdAt_id_idx" ON "ContactSubmission"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_createdAt_id_idx" ON "ContactSubmission"("status", "createdAt", "id");
