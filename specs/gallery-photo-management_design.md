# Feature: Gallery Photo Management

## Requirements

- While an authenticated administrator is in `/admin`, when they select a JPEG, PNG, or WebP image and provide alternative text, the system shall validate the metadata, upload the file through authenticated 1 MiB chunks, process it on the server, and publish optimized WebP variants in the gallery.
- While a gallery photo is active, when an authenticated administrator confirms deletion, the system shall hide it immediately and remove its database assets, upload chunks, and parent record.
- While a visitor opens `/` or `/galeria`, the system shall display only active gallery photos and shall use the optimized thumbnail in grids and the full-size variant in the lightbox.
- While an authenticated administrator is in `/admin`, the system shall show previews of the homepage mosaic and the full `/galeria` grid using the current photo order.
- While an authenticated administrator changes the order in `/admin`, the system shall allow keyboard- and touch-friendly moves, require an explicit save, and publish the new order atomically.
- When the database is unavailable or an upload is incomplete, the gallery shall fail closed without falling back to a writable local filesystem.

## Architecture

### Frontend

- `app/admin/gallery-manager.tsx` is a client component embedded in the authenticated admin page.
- The manager validates file type, size, and required Polish alt text before requesting an upload URL.
- It reports upload progress by stage, handles failed uploads, confirms deletion, and updates its local list after successful mutations.
- Public gallery pages remain server-rendered and pass database-backed photo data to the existing accessible `GalleryViewer` client component.
- `app/gallery-grid.tsx` is the shared presentational grid used by the public viewer and the CMS previews, so the admin preview keeps the homepage mosaic and full-gallery layout in sync with the public pages.
- `app/admin/gallery-manager.tsx` keeps a saved order and a local working order. Up/down buttons update both previews immediately; `Zapisz kolejność` persists the order and `Cofnij zmiany` restores the last saved order.

### Backend

- PostgreSQL/Prisma gains `GalleryPhotoAsset`, `GalleryPhotoUploadChunk`, `GalleryPhotoVariant`, and the existing `GalleryPhotoStatus` enum. WebP bytes are stored as bounded PostgreSQL `bytea` values.
- `POST /api/admin/gallery` validates upload metadata and returns a chunk size/count for a pending photo. `PUT /api/admin/gallery/[id]/chunks/[index]` accepts one authenticated 1 MiB chunk and makes retries idempotent.
- `POST /api/admin/gallery/[id]/complete` claims the pending chunks, validates and transforms the assembled image with `sharp`, stores full and thumbnail WebP bytes, and activates the database record. The processing state prevents concurrent finalization.
- `DELETE /api/admin/gallery/[id]` marks the record as deleting and removes the parent; PostgreSQL cascades the asset and chunk rows. Static seed photos have no asset rows and are hidden by deleting their database rows.
- `PATCH /api/admin/gallery` accepts a complete, unique list of active photo IDs plus the saved base order. It verifies the base order and ID set against the database and assigns contiguous `sortOrder` values inside a Serializable transaction with bounded P2034 retries. A stale admin view receives `409` and no partial order is applied. The active gallery is capped at 200 photos atomically during upload activation, matching the bounded CMS/public read set.
- Non-active records carry an expiry deadline. `POST /api/cron/gallery-cleanup` removes expired pending, processing, and deleting records and their database chunks; an external scheduler must call it with `GALLERY_CLEANUP_SECRET`.
- `lib/gallery-data.ts` queries active records and returns an empty gallery when the database is unavailable. It never falls back to static files, so a deleted seeded photo cannot reappear during an outage.
- Existing four static photos are seeded as database records by the PostgreSQL migration and are served through a database-guarded route from `gallery-assets/`. They are not exposed as unconditional public files, so deleting a seeded row also removes direct access.
- `app/gallery/[id]/route.ts` serves a selected full or thumbnail WebP asset only for an active database row and retains the database-guarded static fallback for seeded photos.

### Security

- Every mutation requires the existing admin configuration, authenticated admin session, and exact trusted `Origin` check.
- The order endpoint accepts only bounded, strict JSON containing validated photo IDs; the server never accepts client-supplied `sortOrder` values or updates non-active records.
- The browser never receives database credentials; every chunk route requires the existing admin session and exact trusted `Origin` check.
- Upload preparation is limited to 20 requests per trusted client address per 15 minutes using the existing HMAC-backed database limiter.
- Chunk bodies are bounded to 1 MiB and completion verifies contiguous indexes, declared sizes, and the total 8 MiB limit.
- The server validates declared metadata and the downloaded object itself. Only JPEG, PNG, and WebP are accepted, with an 8 MiB request limit and a 40 megapixel processing limit.
- `sharp` decodes, auto-orients, resizes, and re-encodes images, removing EXIF/GPS and other metadata by default. Original filenames are never used as object keys.
- Public responses expose only safe display fields. Image responses include an explicit content type, length, `nosniff`, and `no-store` headers.
- Failed deletion leaves a non-public `DELETING` tombstone for later cleanup rather than returning the image to public queries.

## Implementation Plan

- [x] Define the storage, persistence, and security approach.
- [x] Add the Prisma models, migration, and Neon storage configuration example.
- [x] Implement validation, chunked upload, database asset persistence, and protected upload/finalize/delete routes.
- [x] Replace the static public gallery reads with active database-backed data.
- [x] Add the authenticated admin upload/delete UI and styles.
- [x] Add CMS layout previews and authenticated, conflict-safe photo ordering.
- [x] Add unit/component/route coverage and update documentation.
- [x] Run lint, typecheck, tests, build, and review the final diff.
