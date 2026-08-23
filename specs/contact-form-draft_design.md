# Draft contact form and privacy notice

## Scope

The contact form implementation is prepared for non-commercial draft use. When `CONTACT_FORM_ENABLED=true`, it accepts enquiries from the selected offer modal and stores them in Neon without a test password. Resend notification is optional: all three Resend variables must be configured together to enable it. The public privacy notice is available at `/polityka-prywatnosci` and is intentionally marked as a draft until the controller details and provider review are complete.

## Data flow

1. The browser submits JSON only from the same origin and must acknowledge the draft privacy notice.
2. The route validates the body with Zod, applies a best-effort HMAC-keyed in-memory rate limit, and ignores filled honeypots without saving them.
3. Valid submissions are stored in `ContactSubmission` with the notice version, acknowledgement timestamp, and a 12-month deletion deadline.
4. Resend sends a plain-text notification to the configured administrator address. The sender and recipient are server-only configuration.
5. The daily Vercel Cron job removes expired submissions and expired administrative authentication records.

## Security decisions

- No password or visitor test token is required in the non-commercial draft stage.
- The route fails closed if the feature flag, Resend key, recipient, or rate-limit secret is missing or still a placeholder.
- Same-origin, JSON content type, bounded body size, strict schema validation, a honeypot, and rate limiting are enforced server-side.
- Raw client addresses are not persisted; the draft rate limiter receives only an HMAC-derived identifier and is bounded per runtime instance.
- Request bodies and personal fields are not logged.
- The form explicitly warns against health or other sensitive child data.
- The XML CMS export remains a sensitive administrator-only operation.

## Retention

- Contact submissions: 12 months from receipt, enforced by `deleteAfter` and the daily cleanup job.
- Admin magic links: until expiry.
- Admin sessions: until expiry or revocation.
- Login rate-limit buckets: until their reset time.
- Provider logs, mail copies, and database backups: dependent on the configured provider policies and still require verification before commercial use.

## Required configuration

Configure `CONTACT_FORM_ENABLED=true`, `DATABASE_URL`, `CONTACT_RATE_LIMIT_SECRET`, and `CRON_SECRET` in the intended non-commercial Vercel/Neon environment. Configure all three Resend variables only if e-mail notifications are desired. Apply the privacy-notice Prisma migration before activation. Replace and review all placeholders before commercial use.

## Commercial-readiness gate

Before commercial use, replace all placeholders in the privacy notice, confirm the controller and privacy contact, verify Vercel/Neon/Resend processing terms and regions, review the legal bases, confirm backup/provider retention, and obtain legal approval of the final notice.
