import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  contactSubmissionFilters,
  getContactSubmissions,
  parseContactSubmissionQuery,
  type ContactSubmissionFilter,
  type ContactSubmissionRow,
} from "@/lib/contact-submissions";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { DeleteSubmissionButton } from "./delete-submission-button";
import { SubmissionList } from "./submission-list";
import { AdminPanel } from "../admin-panel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Zgłoszenia kontaktowe · Panel administracyjny",
};

type SubmissionsPageProps = {
  searchParams: Promise<{ page?: string; status?: string }>;
};

const statusLabels: Record<Exclude<ContactSubmissionFilter, "ALL">, string> = {
  ARCHIVED: "Zarchiwizowane",
  CONTACTED: "Skontaktowano się",
  NEW: "Nowe",
};

const lessonLabels: Record<string, string> = {
  "junior-voice": "Junior Voice",
  "rehabilitacja-zaburzen-glosu": "Rehabilitacja zaburzeń głosu",
  rytmika: "Rytmisolki",
  "studio-wokalne": "Studio Wokalne",
};

const ageLabels: Record<string, string> = {
  "10-15": "10–15 lat",
  "16-plus": "16 lat lub więcej",
  "3-5": "3–5 lat",
  "6-9": "6–9 lat",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(value);
}

function statusLabel(status: ContactSubmissionRow["status"]) {
  return statusLabels[status];
}

function pageHref(status: ContactSubmissionFilter, page: number) {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/submissions?${query}` : "/admin/submissions";
}

function SubmissionCard({ submission }: { submission: ContactSubmissionRow }) {
  return <details className="admin-submission-card">
    <summary className="admin-submission-summary">
       <span className="admin-submission-summary-name">{submission.childName || submission.parentName || "Bez podanego imienia"}</span>
    </summary>
    <div className="admin-submission-expanded">
      <header className="admin-submission-card-header">
        <p>{formatDate(submission.createdAt)}</p>
        <span className={`admin-status admin-status-${submission.status.toLowerCase()}`}>{statusLabel(submission.status)}</span>
      </header>
      <dl className="admin-submission-details">
        <div><dt>E-mail</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>
        {submission.phone ? <div><dt>Telefon</dt><dd><a href={`tel:${submission.phone}`}>{submission.phone}</a></dd></div> : null}
        {submission.lessonType ? <div><dt>Zajęcia</dt><dd>{lessonLabels[submission.lessonType] || submission.lessonType}</dd></div> : null}
        {submission.childAgeRange ? <div><dt>Wiek uczestnika</dt><dd>{ageLabels[submission.childAgeRange] || submission.childAgeRange}</dd></div> : null}
        <div><dt>Informacja prywatności</dt><dd>{submission.privacyNoticeVersion || "Brak zapisanej wersji"}{submission.privacyNoticeAcknowledgedAt ? ` · potwierdzono ${formatDate(submission.privacyNoticeAcknowledgedAt)}` : ""}</dd></div>
      </dl>
      <div className="admin-submission-message">
        <h3>Wiadomość</h3>
        <p>{submission.message || "Brak wiadomości — pole pozostawiono puste."}</p>
      </div>
      <p className={submission.deleteAfter ? "admin-submission-retention" : "admin-submission-retention admin-submission-retention-warning"}>
        {submission.deleteAfter ? `Planowane usunięcie: ${formatDate(submission.deleteAfter)}` : "Brak ustawionego terminu retencji — wymaga decyzji administratora."}
      </p>
       <DeleteSubmissionButton id={submission.id} parentName={submission.childName || submission.parentName || "Bez podanego imienia"} />
    </div>
  </details>;
}

export default async function SubmissionsPage({ searchParams }: SubmissionsPageProps) {
  const config = getAdminAuthConfig();
  if (!config) {
    return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  }
  if (!(await getAdminSession())) {
    redirect("/admin");
  }

  const query = parseContactSubmissionQuery(await searchParams);
  const result = await getContactSubmissions(query);

  return <AdminPanel title="Zgłoszenia kontaktowe">
      <section className="admin-submissions-export">
        <p className="admin-submissions-intro">Domyślnie widoczne są tylko imiona i nazwiska. Rozwiń zgłoszenie, aby zobaczyć szczegóły. Usunięcie rekordu jest trwałe. Eksport XML zawiera dane osobowe — przechowuj go i usuwaj bezpiecznie.</p>
        <form action="/api/admin/submissions/export" method="post">
          <button className="admin-secondary-button" type="submit">Pobierz XML</button>
        </form>
      </section>
      <form className="admin-submissions-filter admin-form" method="get">
        <label htmlFor="submission-status">Status zgłoszenia
          <select defaultValue={query.status} id="submission-status" name="status">
            {contactSubmissionFilters.map((status) => <option key={status} value={status}>{status === "ALL" ? "Wszystkie" : statusLabels[status]}</option>)}
          </select>
        </label>
        <button type="submit">Filtruj</button>
      </form>
      {result === undefined ? <p className="admin-notice" role="alert">Nie udało się wczytać zgłoszeń kontaktowych.</p> : (
        <SubmissionList>
          {result.submissions.length === 0
            ? <p className="admin-submissions-empty">Brak zgłoszeń dla wybranego filtra.</p>
            : result.submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} />)}
        </SubmissionList>
      )}
      <nav aria-label="Paginacja zgłoszeń" className="admin-submissions-pagination">
        {query.page > 1 ? <Link href={pageHref(query.status, query.page - 1)}>← Nowsze</Link> : <span aria-disabled="true">← Nowsze</span>}
        <span>Strona {query.page}</span>
        {result?.hasNext ? <Link href={pageHref(query.status, query.page + 1)}>Starsze →</Link> : <span aria-disabled="true">Starsze →</span>}
      </nav>
  </AdminPanel>;
}
