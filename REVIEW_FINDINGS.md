# Complete Solution Review

## Findings

### 1. Critical: Failed updates can modify participants before returning an error

References:

- `app/api/admin/attendance/[id]/route.ts:45-70`

The PATCH transaction deletes and recreates participant rows before checking the time overlap or validating the group. Returning a value from an interactive Prisma transaction commits the transaction. If the update later returns a conflict or invalid-group result, the user receives an error but the participant list may already have been replaced.

The participant mutation must happen after all validation and conflict checks, or the transaction must explicitly throw to force a rollback.

### 2. High: Calendar-created activities do not persist the selected group

References:

- `app/admin/calendar/calendar-board.tsx:266-274`
- `app/api/admin/attendance/route.ts`

The calendar sends the selected group participants but does not send `groupId`. Calendar-created activities can therefore have no persisted group association. This affects group-filtered reports, group display after navigating to attendance, and future group identification when memberships change.

### 3. High: Group-filtered report previews can show unrelated people

References:

- `app/admin/attendance/attendance-report-download.tsx:107-110`

When no person is selected, the preview client appends every known recipient even if a group filter is active. A group preview can therefore show people outside that group with grey unassigned cells. The CSV query filters by group correctly, so preview and download can disagree.

### 4. High: Invalid dates and times are normalized instead of rejected

References:

- `lib/attendance.ts:5`
- `lib/attendance.ts:16-23`

The schemas validate only string shape, not semantic calendar values. JavaScript date parsing can normalize values such as `2026-02-31` or `24:00` into different dates/times. This can create an activity on a different day than the user entered and also affects report date ranges.

### 5. High: Overlap protection is race-prone

References:

- `app/api/admin/attendance/route.ts:71-105`
- `app/api/admin/attendance/[id]/route.ts:59-70`
- `prisma/schema.prisma:78-82`

Overlap checks use `findFirst()` followed by a separate insert/update. Concurrent requests can both see no conflict and then create overlapping activities. There is no database exclusion constraint or serializable transaction protecting the invariant.

### 6. High: Repeating activity creation can leave a partial series

References:

- `app/api/admin/attendance/route.ts:87-105`

Each repeated occurrence is inserted separately. If a later occurrence fails unexpectedly, the API returns an error while earlier records remain stored. A retry can create an inconsistent or partially duplicated series.

### 7. Medium: Report preview merges people who share an email

References:

- `app/api/admin/attendance/report/route.ts:68-75`

Preview identity is keyed by email. Multiple children can share a parent email, so their names and attendance statuses can be merged into one row. The CSV keeps separate participant rows, creating a preview/download mismatch. Preview identity should use `submissionId`.

### 8. Medium: The attendance editor only loads 1,000 recipients

References:

- `lib/attendance.ts:123-131`

Existing activities containing older submissions may show missing participants in `/admin/attendance` because the recipient query is limited to the newest 1,000 rows. Those participants cannot be edited through the UI even though their database records remain.

### 9. Medium: Contact cleanup cascades and removes attendance history

References:

- `prisma/schema.prisma:82-93`
- `lib/contact-cleanup.ts:19-29`

`AttendanceParticipant` references `ContactSubmission` with cascade deletion. Retention cleanup or manual submission deletion removes historical attendance participant rows, changing historical counts and reports. If attendance history must survive, it needs an anonymized retained identity rather than a cascading foreign key.

### 10. Medium: CSV export is vulnerable to spreadsheet formula injection

References:

- `app/api/admin/attendance/report/route.ts:22-24`

CSV fields are quoted but not neutralized. Editable names or emails beginning with `=`, `+`, `-`, or `@` can be interpreted as formulas by spreadsheet software. Export values should be prefixed or otherwise encoded as safe text.

### 11. Low: Opening and saving an activity without an end time adds one hour

References:

- `app/admin/calendar/calendar-board.tsx:153-157`
- `app/admin/attendance/attendance-manager.tsx:54-58`

Activities with `endsAt = null` are opened with a synthesized end time one hour later. Saving without changing anything silently converts the activity into a timed one-hour activity.

### 12. Low: Partial unique index is not represented accurately in Prisma schema

References:

- `prisma/schema.prisma:76`
- `prisma/migrations/20260924110000_attendance_unique_name_date/migration.sql`

The database uniqueness is conditional on `invalid = false`, but the Prisma schema declares a normal `@@unique([name, activityDate])`. Future Prisma migration generation can detect drift or attempt to replace the partial index.

## Test Gaps

The current local verification passes:

- 404 tests passed
- 1 test skipped
- TypeScript passed
- Production build passed
- ESLint passed with 0 errors and 1 existing unrelated warning

Important missing coverage:

- Calendar creation asserting `groupId` is included.
- PATCH overlap failure proving participants remain unchanged.
- Invalid dates such as `2026-02-31`.
- Invalid times such as `24:00`.
- Concurrent overlap requests.
- Mid-series failure and rollback.
- Duplicate emails belonging to different children.
- Group-filtered report preview contents.
- More than 1,000 recipients.
- CSV formula-injection values.
- Retention cleanup effects on historical attendance.
- Mobile browser behavior for the calendar and report modal.
