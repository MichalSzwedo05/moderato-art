# Feature: Gallery Photo Management

## Requirements

- While an authenticated administrator is in `/admin`, when they select a JPEG, PNG, or WebP image and provide alternative text, the system shall validate the metadata, upload the original through a short-lived presigned URL, process it on the server, and publish optimized WebP variants in the gallery.
- While a gallery photo is active, when an authenticated administrator confirms deletion, the system shall hide it immediately, remove its stored objects when applicable, and remove its database record after successful cleanup.
- While a visitor opens `/` or `/galeria`, the system shall display only active gallery photos and shall use the optimized thumbnail in grids and the full-size variant in the lightbox.
- When storage configuration is missing or invalid, upload and object-backed deletion shall fail closed without exposing credentials or falling back to a writable local filesystem.

## Architecture

### Frontend

- `app/admin/gallery-manager.tsx` is a client component embedded in the authenticated admin page.
- The manager validates file type, size, and required Polish alt text before requesting an upload URL.
- It reports upload progress by stage, handles failed uploads, confirms deletion, and updates its local list after successful mutations.
- Public gallery pages remain server-rendered and pass database-backed photo data to the existing accessible `GalleryViewer` client component.

### Backend

- PostgreSQL/Prisma gains a `GalleryPhoto` model and `GalleryPhotoStatus` enum.
- `POST /api/admin/gallery/upload` validates upload metadata and returns a ten-minute presigned S3-compatible PUT URL for a pending photo.
- `POST /api/admin/gallery/[id]/complete` claims the pending object, reads it, validates and transforms it with `sharp`, stores full and thumbnail WebP objects, and activates the database record. The processing state prevents concurrent finalization from deleting another request's output.
- `DELETE /api/admin/gallery/[id]` marks the record as deleting, removes its storage objects, and removes the record. Static seed photos have no object keys and are hidden by deleting their database rows.
- Non-active records carry an expiry deadline. `POST /api/cron/gallery-cleanup` removes expired pending, processing, and deleting records and their private objects; an external scheduler must call it with `GALLERY_CLEANUP_SECRET`.
- After activation, the private upload object remains tracked until the cleanup job removes it; the presigned upload uses `If-None-Match: *` so the URL cannot overwrite it after activation.
- `lib/gallery-data.ts` queries active records and returns an empty gallery when the database is unavailable. It never falls back to static files, so a deleted seeded photo cannot reappear during an outage.
- Existing four static photos are seeded as database records by the PostgreSQL migration and are served through a database-guarded route from `gallery-assets/`. They are not exposed as unconditional public files, so deleting a seeded row also removes direct access.
- `lib/gallery-storage.ts` is provider-agnostic over S3-compatible storage through server-only environment variables.

### Security

- Every mutation requires the existing admin configuration, authenticated admin session, and exact trusted `Origin` check.
- Credentials remain server-only; the browser receives only a short-lived, object-specific presigned URL.
- Upload preparation is limited to 20 requests per trusted client address per 15 minutes using the existing HMAC-backed database limiter.
- Storage reads bind the GET to the HEAD ETag and cap streamed buffering, preventing a replacement object from bypassing the upload limit between checks.
- The server validates declared metadata and the downloaded object itself. Only JPEG, PNG, and WebP are accepted, with an 8 MiB request limit and a 40 megapixel processing limit.
- `sharp` decodes, auto-orients, resizes, and re-encodes images, removing EXIF/GPS and other metadata by default. Original filenames are never used as object keys.
- Public responses expose only safe display fields. Cache headers are immutable for generated objects and `no-store` for mutation responses.
- Failed deletion leaves a non-public `DELETING` tombstone for later cleanup rather than returning the image to public queries.

## Implementation Plan

- [x] Define the storage, persistence, and security approach.
- [x] Add the Prisma model, migration, and storage configuration examples.
- [x] Implement validation, S3-compatible storage helpers, and protected upload/finalize/delete routes.
- [x] Replace the static public gallery reads with active database-backed data.
- [x] Add the authenticated admin upload/delete UI and styles.
- [x] Add unit/component/route coverage and update documentation.
- [ ] Run lint, typecheck, tests, build, and review the final diff.
