# Moderato Art

Moderato Art is a Polish-language website for children's singing, music, and rhythm classes.

## Public Preview

The current Vercel deployment is available at [https://moderato-art.vercel.app](https://moderato-art.vercel.app).

The contact form implementation is available as a non-commercial draft. The privacy page remains visibly marked as a draft with placeholders; the form can be enabled explicitly for this non-commercial stage and stores submissions in Neon for 12 months. E-mail notification through Resend is optional.

## Technology

- Next.js 16 with TypeScript
- PostgreSQL 17
- Neon PostgreSQL support for Vercel deployments
- Docker Compose
- Caddy reverse proxy with automatic HTTPS
- GitHub Actions and GitHub Container Registry

## Local Development

Docker Desktop must be running.

```bash
cp .env.example .env
docker compose up --build
```

The website will be available at `http://localhost:3000` and PostgreSQL at `localhost:5432`.

After the first start, apply committed database migrations in the development container:

```bash
docker compose exec app npm run db:migrate:deploy
```

Stop local services with:

```bash
docker compose down
```

Remove the local database volume when a complete reset is required:

```bash
docker compose down --volumes
```

## Quality Checks

Node.js 22.22.2 LTS, Node.js 24.15 or newer, or Node.js 26 or newer is required outside Docker. Node.js 23 and Node.js 25 are not supported by the dependency set.

```bash
npm ci
npm run lint
npm run typecheck
npm run db:generate
npm run build
```

The health endpoint is available at `GET /health`.

## Vercel and Neon Demo Setup

The Vercel deployment can use Neon instead of the local Docker PostgreSQL service. This makes the same database-backed application available to a client through Vercel while keeping local Docker development optional.

1. Create a Neon project and database, or connect Neon to the Vercel project through the Neon integration.
2. Create separate Neon branches/databases for development, preview, and production. Never use the production database for local development or Vercel previews.
3. In Vercel project settings, add the following server-only variables to the matching environment:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string for application runtime; it contains the `-pooler` hostname and `sslmode=require`. |
| `DIRECT_URL` | Neon direct, non-pooled connection string for Prisma migrations; it also uses `sslmode=require`. |
| `NEXT_PUBLIC_SITE_URL` | Production URL, for example `https://moderato-art.vercel.app`. Preview deployments fall back to `VERCEL_URL` when Vercel System Environment Variables are enabled. |
| `CONTACT_FORM_ENABLED` | `false` until the separate data-collection activation review is complete. |

Do not expose either database URL through a `NEXT_PUBLIC_` variable.

For a Vercel-compatible local preview:

```bash
npx vercel link
npx vercel pull --environment=preview
npx vercel dev
```

Use `--environment=development` instead when testing against the Neon development database. Enable Vercel System Environment Variables in Project Settings for the automatic `VERCEL_URL` metadata fallback.

The Prisma runtime automatically uses the Neon adapter for `*.neon.tech` URLs and the PostgreSQL adapter for local Docker URLs. Prisma migration commands prefer `DIRECT_URL`; run `npm run db:migrate:deploy` against the intended Neon branch before enabling a deployment that requires the new schema.

Vercel does not apply Prisma migrations automatically. Keep `CONTACT_FORM_ENABLED=false` until a dedicated, reviewed migration and data-collection activation workflow is configured.

## Admin CMS

The CMS is an application-level `/admin` login, not Caddy browser Basic Auth. It is disabled by default and fails closed unless `ADMIN_CMS_ENABLED=true`. Set one explicit `ADMIN_AUTH_MODE`: `magic_link` for a Resend magic link sent to one exact email address, or `password` for one username and an Argon2id password hash. The login form and routes fail closed if settings for the selected mode are incomplete or credentials for both modes are present.

Set these server-only variables only after applying all committed Prisma migrations, including `20260731120000_admin_cms`, `20260804150000_admin_password_sessions`, `20260820150000_gallery_photo_management`, `20260821170000_neon_gallery_assets`, `20260821171000_remove_gallery_object_keys`, and `20260822180000_contact_submission_inbox_indexes`:

| Variable | Requirement |
| --- | --- |
| `ADMIN_CMS_ENABLED` | Exactly `true` to enable the CMS. |
| `ADMIN_AUTH_MODE` | Exactly `magic_link` or `password`. Existing deployments default to `magic_link` only when omitted. |
| `ADMIN_EMAIL` | Required only for `magic_link`: the one exact administrator email address. Leave empty in password mode. |
| `ADMIN_AUTH_URL` | The canonical public HTTPS origin only, for example `https://moderato-art.pl`; no path, query, or trailing slash. Never derive this from request headers. |
| `ADMIN_AUTH_RESEND_FROM` | Required only for `magic_link`: a sender on a Resend-verified domain. Leave empty in password mode. |
| `ADMIN_AUTH_RESEND_KEY` | Required only for `magic_link`: a dedicated restricted Resend sending key. Leave empty in password mode. |
| `ADMIN_USERNAME` | Required only for `password`: 1–100 ASCII letters, digits, `.`, `_`, or `-`. |
| `ADMIN_PASSWORD_HASH` | Required only for `password`: Argon2id PHC hash. Never store a plaintext password. |
| `ADMIN_RATE_LIMIT_SECRET` | A unique random secret of at least 32 characters, used to HMAC client addresses before storing rate-limit buckets. |

Generate the password hash on a trusted machine using Argon2id with at least 64 MiB memory and three iterations. Store only the complete PHC string as an encrypted Vercel/environment variable. In `.env.production`, wrap the complete hash in single quotes, for example `ADMIN_PASSWORD_HASH='$argon2id$...'`, so Docker Compose does not interpolate `$`. Changing `ADMIN_PASSWORD_HASH` automatically invalidates password-mode sessions. Password login retains the per-IP database limiter and adds a wider account limiter; both reset after 15 minutes.

The production Compose app is reachable only through Caddy. Caddy replaces `X-Forwarded-For` with the directly connected client address, so the app can use it for its database-backed, 15-minute login rate limit without storing raw IP addresses. Do not publish port 3000, bypass Caddy, or change Caddy to pass client-supplied forwarding headers. The admin session cookie is `__Host-` scoped, Secure, HttpOnly, SameSite=Lax, and has an eight-hour server-checked expiry; logout revokes it in the database. Switching modes invalidates sessions created through the other mode; delete outstanding magic links and revoke sessions when disabling the CMS.

Articles are created as Markdown through `/admin`; only their metadata and Markdown source are stored. Public rendering remains a separate concern and must use `react-markdown` rather than injecting raw HTML.

### Gallery Photo Management

The authenticated `/admin` panel also manages the public gallery. An administrator can upload JPEG, PNG, or WebP files up to 8 MiB, provide Polish alternative text, delete existing gallery photos, preview the homepage mosaic and full gallery layout, and change the photo order with the move buttons. The gallery supports up to 200 active photos. The browser sends the file as authenticated 1 MiB chunks to the application, and Neon stores the optimized WebP full-size and thumbnail variants as PostgreSQL `bytea` values. The server validates the actual image and strips metadata before publication. Order changes are saved explicitly through a protected, conflict-safe transaction.

Configure this server-only variable before enabling uploads:

| Variable | Requirement |
| --- | --- |
| `GALLERY_CLEANUP_SECRET` | Server-only bearer secret for the scheduled `POST /api/cron/gallery-cleanup` job. |

Apply the committed Prisma migrations, including `20260821170000_neon_gallery_assets`, before using the gallery CMS. Existing gallery photos are seeded as database records and served through a database-guarded route from `gallery-assets/`; new and processed photos are served from Neon through the same route. Generated full-size variants are limited to 4 MiB and thumbnails to 1 MiB to stay below serverless response limits. Deleting a photo removes its database assets and any unfinished upload chunks through cascading deletes.

Configure an external scheduler, for example a daily cron on the VPS, to call `POST /api/cron/gallery-cleanup` with `Authorization: Bearer $GALLERY_CLEANUP_SECRET`. Pending, processing, and failed-deletion records expire after bounded periods and their database rows (including chunks) are removed.

The Neon-only implementation is intended for the small Vercel/Neon test gallery. PostgreSQL storage and serverless bandwidth grow with every image request; move the asset layer to an S3-compatible provider such as Hetzner Object Storage before a large production gallery.

## Contact Form and Draft Privacy Mode

The implementation for `POST /api/contact` validates input, requires same-origin requests and a privacy acknowledgement, applies a bounded best-effort per-runtime rate limit, and stores submissions in Neon. Optional Resend configuration adds an identifier-only notification; collection is intended only for the non-commercial draft stage while the policy contains placeholders.

Configure these server-only variables in Vercel or the equivalent runtime:

- `CONTACT_FORM_ENABLED=true` only for the explicitly non-commercial draft stage after the database migration and cleanup scheduler are verified
- `RESEND_API_KEY`, `CONTACT_FORM_RECIPIENT`, and `CONTACT_FORM_RESEND_FROM` are optional and must either all be configured or all be empty
- `CONTACT_RATE_LIMIT_SECRET` with a random value of at least 32 characters
- `CRON_SECRET` for the daily retention cleanup job

Submissions are assigned a 12-month deletion deadline. On Vercel, the committed `vercel.json` schedule calls the cleanup route daily and removes expired submissions, expired admin links/sessions, and expired login rate-limit records. The Docker/VPS deployment does not include a scheduler; leave `CONTACT_FORM_ENABLED=false` there until a protected daily host cron is configured, for example:

```bash
curl --fail --silent --show-error -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://moderato-art.pl/api/cron/contact-cleanup
```

Apply the committed privacy-notice migration before enabling the form against any hosted database.

### CMS Submission Inbox

Authenticated administrators can open `/admin/submissions` to view and permanently delete existing `ContactSubmission` records or download all currently stored records as one XML file. The inbox is paginated and filtered by the existing status; records are collapsed to the contact name by default and expand to show the remaining fields. XML exports are limited to 1,000 records/4 MiB, use a UTF-8 BOM and CRLF structural line endings while preserving message newlines, contain personal data, and must be stored and deleted securely.

Security updates from Dependabot remain immediate and are exempt from the one-open-PR limit. Version updates are grouped into one weekly PR per npm, Docker, and GitHub Actions ecosystem; PostgreSQL major updates remain isolated for a reviewed database-upgrade procedure.

## CI/CD

The workflow in `.github/workflows/ci.yml` runs on every pull request and push to `main`.

For pull requests, it:

- installs locked dependencies
- runs ESLint
- runs TypeScript checks
- creates a production build
- builds and scans the Docker image with Trivy

For pushes to `main`, it additionally:

- publishes an image tagged with the full Git commit SHA to GitHub Container Registry

The production workflow in `.github/workflows/deploy-production.yml` runs only when it is started manually from the GitHub Actions page. It deploys the image for the selected `main` revision after GitHub Environment approval.

This separation allows CI to work before the production VPS, domain, and secrets are configured.

## Production Setup

### 1. Provision the VPS

Create an Ubuntu 24.04 VPS on Hetzner. Point the `A` records for `moderato-art.pl` and `www.moderato-art.pl` to its public IPv4 address before the first deployment.

Allow only the following incoming ports in the Hetzner firewall:

- `22` for SSH
- `80` for HTTP and the ACME challenge
- `443` for HTTPS

Install Docker Engine, the Docker Compose plugin, and Git on the VPS. Create a non-root deployment user that belongs to the `docker` group.

### 2. Prepare the server directory

On the VPS, clone the public repository into a directory owned by the deployment user:

```bash
git clone https://github.com/MichalSzwedo05/moderato-art.git /opt/moderato-art
cd /opt/moderato-art
cp .env.production.example .env.production
chmod 600 .env.production
```

Replace all placeholder values in `.env.production`. Generate a unique, long PostgreSQL password and use it in both `POSTGRES_PASSWORD` and `DATABASE_URL`.

Do not commit `.env.production`.

### 3. Create the GitHub production environment

In GitHub, open `Settings` -> `Environments` and create an environment named `production`.

Configure a required reviewer for this environment. This is the manual approval step before each deployment.

Create the following production environment secrets:

| Secret | Value |
| --- | --- |
| `GHCR_PULL_TOKEN` | Fine-grained GitHub token with read-only access to Packages |
| `GHCR_USERNAME` | GitHub account name allowed to use the token |
| `VPS_APP_PATH` | `/opt/moderato-art` |
| `VPS_HOST` | VPS IPv4 address or hostname |
| `VPS_PORT` | `22` |
| `VPS_USER` | Non-root deployment user on the VPS |
| `VPS_SSH_KNOWN_HOSTS` | The VPS SSH host key in known-hosts format |
| `VPS_SSH_PRIVATE_KEY` | Private SSH key for the deployment user |

Create the following production environment variable:

| Variable | Value |
| --- | --- |
| `SITE_DOMAIN` | `moderato-art.pl` |

Use a dedicated deployment SSH key. Do not use a personal SSH key or store it in the repository.

To obtain the known-hosts value from a trusted network, run:

```bash
ssh-keyscan -H YOUR_VPS_IP
```

Verify the displayed SSH fingerprint against the value shown in the Hetzner console before saving it as a GitHub secret.

### 4. Initial deployment

Push a commit to `main` and wait for the `Continuous Integration` workflow to complete successfully. It publishes an image for that commit to GitHub Container Registry.

Open `Actions` -> `Deploy Production` -> `Run workflow`, select `main`, and run the workflow. It will then wait for the required reviewer to approve the production deployment.

Caddy requests and renews the TLS certificate automatically after DNS is correctly configured.

## Rollback

Database migrations must be backwards compatible. Do not roll back database schema automatically.

To roll back the application, replace `COMMIT_SHA` with a previously deployed commit SHA and run on the VPS:

```bash
cd /opt/moderato-art
git fetch --depth=1 origin COMMIT_SHA
git checkout --detach COMMIT_SHA
APP_IMAGE=ghcr.io/michalszwedo05/moderato-art:COMMIT_SHA \
  docker compose --env-file .env.production -f docker-compose.production.yml pull app
APP_IMAGE=ghcr.io/michalszwedo05/moderato-art:COMMIT_SHA \
  docker compose --env-file .env.production -f docker-compose.production.yml up -d --remove-orphans
curl --fail https://moderato-art.pl/health
```

## Database Backups

Before storing contact form data in production, configure an encrypted daily PostgreSQL backup outside the VPS. Test restoration at least once before accepting real submissions.

## Database Activation Notes

The committed privacy-notice migration has been applied to the configured Neon database used by the current Vercel implementation. A separate VPS deployment uses the in-stack PostgreSQL service and must run the migration profile before accepting submissions. Run the migration image/job against the VPS database, verify it from an empty database, and keep the form disabled until both the migration and a daily cleanup scheduler are confirmed.
