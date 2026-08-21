-- Refuse the migration rather than silently losing references if legacy
-- external-storage records exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "GalleryPhoto"
    WHERE "uploadObjectKey" IS NOT NULL
       OR "objectKey" IS NOT NULL
       OR "thumbnailObjectKey" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy gallery object keys while references still exist';
  END IF;
END $$;

ALTER TABLE "GalleryPhoto"
  DROP COLUMN "uploadObjectKey",
  DROP COLUMN "objectKey",
  DROP COLUMN "thumbnailObjectKey";
