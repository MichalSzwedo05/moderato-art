-- CreateEnum
CREATE TYPE "GalleryPhotoVariant" AS ENUM ('FULL', 'THUMBNAIL');

-- CreateTable
CREATE TABLE "GalleryPhotoAsset" (
    "photoId" TEXT NOT NULL,
    "variant" "GalleryPhotoVariant" NOT NULL,
    "data" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryPhotoAsset_pkey" PRIMARY KEY ("photoId", "variant"),
    CONSTRAINT "GalleryPhotoAsset_sizeBytes_check" CHECK ("sizeBytes" > 0 AND octet_length("data") = "sizeBytes"),
    CONSTRAINT "GalleryPhotoAsset_variant_size_check" CHECK (
      ("variant" = 'FULL' AND "sizeBytes" <= 4194304)
      OR ("variant" = 'THUMBNAIL' AND "sizeBytes" <= 1048576)
    ),
    CONSTRAINT "GalleryPhotoAsset_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "GalleryPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GalleryPhotoUploadChunk" (
    "photoId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryPhotoUploadChunk_pkey" PRIMARY KEY ("photoId", "chunkIndex"),
    CONSTRAINT "GalleryPhotoUploadChunk_sizeBytes_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 1048576 AND octet_length("data") = "sizeBytes"),
    CONSTRAINT "GalleryPhotoUploadChunk_chunkIndex_check" CHECK ("chunkIndex" >= 0 AND "chunkIndex" < 8),
    CONSTRAINT "GalleryPhotoUploadChunk_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "GalleryPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GalleryPhotoUploadChunk_photoId_chunkIndex_idx" ON "GalleryPhotoUploadChunk"("photoId", "chunkIndex");
