# Feature: CMS Contact Submission Inbox

## Scope

- An authenticated administrator can open `/admin/submissions` and inspect existing `ContactSubmission` records.
- The view supports bounded pagination and filtering by the existing `NEW`, `CONTACTED`, and `ARCHIVED` statuses.
- The view provides a single authenticated XML download containing all currently stored submissions, independent of the visible page or status filter.
- An administrator can permanently delete an individual submission after an explicit confirmation. Public collection and retention are implemented separately in the draft contact-form feature.

## Architecture

- `app/admin/submissions/page.tsx` is a dynamic, server-rendered page. It checks the CMS configuration and administrator session before querying any contact data.
- `lib/contact-submissions.ts` performs a bounded Prisma query, selects only the fields needed by the inbox, and sorts by `createdAt DESC, id DESC`.
- Contact data is rendered as React text with preserved whitespace; no HTML from a submission is injected into the document.
- `POST /api/admin/submissions/export` returns a readable UTF-8 XML attachment with a BOM, CRLF structural line endings, preserved message newlines, escaped values, explicit null fields, stable newest-first ordering, and no external entities.
- The export is limited to 1,000 records and 4 MiB encoded bytes; it refuses oversized exports instead of truncating them.
- The main `/admin` page links to the inbox but does not load contact PII itself.

## Security and privacy

- Anonymous requests are redirected to the existing admin login and never execute the submissions query.
- The page is `force-dynamic` and marked `noindex`; it is not a public API.
- Database failures produce a generic administrator message. Logs contain no submission fields.
- A missing `deleteAfter` value is shown as a retention warning rather than treated as an ordinary completed record.
- The export response is private and uncached, and the downloaded file is explicitly treated as sensitive personal data.
- Submission details are collapsed by default; the summary shows only the contact name. Deletion is authenticated, same-origin protected, confirmed in the browser, and irreversible.
- The public contact form is a non-commercial draft and is linked to the draft privacy notice; commercial use still requires replacing placeholders and completing legal/provider review.

## Validation

- Test the query's status parsing, ordering, bounded page size, empty/error results, and selected fields.
- Test authenticated page rendering for every status, optional fields, safe multiline/HTML-looking messages, pagination, and the retention warning.
- Run lint, typecheck, tests, and the production build.
