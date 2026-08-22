# Feature: CMS Contact Submission Inbox

## Scope

- An authenticated administrator can open `/admin/submissions` and inspect existing `ContactSubmission` records.
- The view supports bounded pagination and filtering by the existing `NEW`, `CONTACTED`, and `ARCHIVED` statuses.
- This feature is read-only. It does not activate public data collection, change retention policy, or add status mutation actions.

## Architecture

- `app/admin/submissions/page.tsx` is a dynamic, server-rendered page. It checks the CMS configuration and administrator session before querying any contact data.
- `lib/contact-submissions.ts` performs a bounded Prisma query, selects only the fields needed by the inbox, and sorts by `createdAt DESC, id DESC`.
- Contact data is rendered as React text with preserved whitespace; no HTML from a submission is injected into the document.
- The main `/admin` page links to the inbox but does not load contact PII itself.

## Security and privacy

- Anonymous requests are redirected to the existing admin login and never execute the submissions query.
- The page is `force-dynamic` and marked `noindex`; it is not a public API.
- Database failures produce a generic administrator message. Logs contain no submission fields.
- A missing `deleteAfter` value is shown as a retention warning rather than treated as an ordinary completed record.
- The public contact form remains disabled or test-only until the separate data-collection, privacy-policy, retention, abuse-protection, and cleanup review is approved.

## Validation

- Test the query's status parsing, ordering, bounded page size, empty/error results, and selected fields.
- Test authenticated page rendering for every status, optional fields, safe multiline/HTML-looking messages, pagination, and the retention warning.
- Run lint, typecheck, tests, and the production build.
