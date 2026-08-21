-- CreateEnum
CREATE TYPE "GalleryPhotoStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACTIVE', 'DELETING');

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "altText" VARCHAR(240) NOT NULL,
    "imageUrl" VARCHAR(2048),
    "thumbnailUrl" VARCHAR(2048),
    "uploadObjectKey" VARCHAR(512),
    "objectKey" VARCHAR(512),
    "thumbnailObjectKey" VARCHAR(512),
    "width" INTEGER,
    "height" INTEGER,
    "mimeType" VARCHAR(50),
    "sizeBytes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "GalleryPhotoStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryPhoto_status_sortOrder_idx" ON "GalleryPhoto"("status", "sortOrder");
CREATE INDEX "GalleryPhoto_status_expiresAt_idx" ON "GalleryPhoto"("status", "expiresAt");

-- Preserve the current static gallery as manageable records. The source files
-- are served through a database-guarded route; deleting a seeded record removes
-- it from all public gallery queries and direct asset access.
INSERT INTO "GalleryPhoto" ("id", "altText", "imageUrl", "thumbnailUrl", "width", "height", "mimeType", "sizeBytes", "sortOrder", "status", "updatedAt")
VALUES
  ('music-room', 'Gitary, keyboard i mikrofon w domowej przestrzeni muzycznej', '/gallery/music-room', '/gallery/music-room', 1200, 800, 'image/jpeg', 186099, 0, 'ACTIVE', CURRENT_TIMESTAMP),
  ('piano-keys', 'Klawisze fortepianu w ciepłym świetle', '/gallery/piano-keys', '/gallery/piano-keys', 1200, 800, 'image/jpeg', 90673, 1, 'ACTIVE', CURRENT_TIMESTAMP),
  ('stage-microphone', 'Mikrofon przygotowany do śpiewu', '/gallery/stage-microphone', '/gallery/stage-microphone', 1200, 800, 'image/jpeg', 107226, 2, 'ACTIVE', CURRENT_TIMESTAMP),
  ('music-studio', 'Instrumenty w kameralnym studiu muzycznym', '/gallery/music-studio', '/gallery/music-studio', 1200, 800, 'image/jpeg', 185787, 3, 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
