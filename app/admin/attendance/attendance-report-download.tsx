"use client";

import { useMemo, useState } from "react";

type Recipient = { childName: string | null; email: string; id: string; parentName: string | null };

function localDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function displayName(recipient: Recipient) {
  return recipient.childName || recipient.parentName || "Bez podanego imienia";
}

function reportFilename() {
  return `raport-obecnosci-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function AttendanceReportDownload({ recipients }: { recipients: Recipient[] }) {
  const today = localDateValue();
  const [submissionId, setSubmissionId] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();
  const sortedRecipients = useMemo(() => [...recipients].sort((left, right) => displayName(left).localeCompare(displayName(right), "pl")), [recipients]);

  async function downloadReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/admin/attendance/report", {
        body: JSON.stringify({ dateFrom, dateTo, submissionId: submissionId || undefined }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: "Nie udało się pobrać raportu." })) as { message?: string };
        throw new Error(body.message || "Nie udało się pobrać raportu.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.download = reportFilename();
      link.href = objectUrl;
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setFeedback({ error: false, message: "Raport został pobrany." });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się pobrać raportu." });
    } finally {
      setPending(false);
    }
  }

  return <section className="attendance-report-section">
    <h2>Sprawdź obecność</h2>
    <form className="attendance-report-download" onSubmit={downloadReport}>
      <div className="attendance-report-fields">
      <label>Dla kogo<select onChange={(event) => setSubmissionId(event.target.value)} value={submissionId}><option value="">Wszyscy uczestnicy</option>{sortedRecipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{displayName(recipient)}</option>)}</select></label>
      <label>Data od<input onChange={(event) => setDateFrom(event.target.value)} required type="date" value={dateFrom} /></label>
      <label>Data do<input onChange={(event) => setDateTo(event.target.value)} required type="date" value={dateTo} /></label>
      </div>
      <button disabled={pending} type="submit">{pending ? "Pobieranie…" : "Pobierz raport"}</button>
      {feedback ? <span className={feedback.error ? "admin-download-feedback admin-download-feedback-error" : "admin-download-feedback"} role={feedback.error ? "alert" : "status"}>{feedback.message}</span> : null}
    </form>
  </section>;
}
