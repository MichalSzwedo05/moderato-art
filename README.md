# Moderato Art

Moderato Art is a Polish-language website for children's singing, music, and rhythm classes.

## Public Preview

The current Vercel deployment is available at [https://moderato-art.vercel.app](https://moderato-art.vercel.app).

The contact form is intentionally unavailable in this preview and remains fail-closed until the legal notice, production database, retention process, and submission-handling workflow are approved.

## Technology

- Next.js 16 with TypeScript
- PostgreSQL 17
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

Stop local services with:

```bash
docker compose down
```

Remove the local database volume when a complete reset is required:

```bash
docker compose down --volumes
```

## Quality Checks

Node.js 22 is required outside Docker.

```bash
npm ci
npm run lint
npm run typecheck
npm run db:generate
npm run build
```

The health endpoint is available at `GET /health`.

## Contact Form and Database Staging

Prisma schema and the initial PostgreSQL migration are present for `ContactSubmission` and `Article`. The public contact form and `POST /api/contact` intentionally return an unavailable state and do not read, validate, log, or store request data.

`CONTACT_FORM_ENABLED` defaults to `false` in local and production Compose configuration. Do not enable data collection until a separately reviewed release provides:

- an approved privacy notice with the legal controller identity, processing basis, recipients, data-subject rights, and policy version;
- a production PostgreSQL host, encrypted backup and restore process, and a scheduled verified deletion process;
- abuse protection, restricted authorised access to submissions, and a documented handling workflow;
- a production migration job that applies and verifies `prisma migrate deploy` before the application rollout.

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

## Planned Database Activation

The initial Prisma migration is committed but has not been applied because Docker Desktop is unavailable in the current development environment. The VPS Compose topology contains a provisional in-stack PostgreSQL service, while the Vercel preview has no production database. Before enabling the form, select the production topology, apply the migration to an isolated PostgreSQL instance, verify it from an empty database, and add a dedicated migration image/job to production deployment.
