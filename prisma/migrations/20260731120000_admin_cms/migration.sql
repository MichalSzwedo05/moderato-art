-- Keep existing articles valid while making category and excerpt required for new CMS entries.
ALTER TABLE "Article" ADD COLUMN "category" VARCHAR(100) NOT NULL DEFAULT 'Aktualnosci';
ALTER TABLE "Article" ADD COLUMN "excerpt" VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE "Article" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Article" ALTER COLUMN "excerpt" DROP DEFAULT;

CREATE TABLE "AdminMagicLink" (
    "id" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "requesterHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminMagicLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "sessionHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminLoginRateLimit" (
    "identifierHash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminLoginRateLimit_pkey" PRIMARY KEY ("identifierHash")
);

CREATE UNIQUE INDEX "AdminMagicLink_tokenHash_key" ON "AdminMagicLink"("tokenHash");
CREATE INDEX "AdminMagicLink_expiresAt_idx" ON "AdminMagicLink"("expiresAt");
CREATE UNIQUE INDEX "AdminSession_sessionHash_key" ON "AdminSession"("sessionHash");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
CREATE INDEX "AdminLoginRateLimit_resetAt_idx" ON "AdminLoginRateLimit"("resetAt");
CREATE INDEX "Article_category_status_idx" ON "Article"("category", "status");
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
