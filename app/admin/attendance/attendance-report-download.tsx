"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Recipient = { childName: string | null; email: string; id: string; parentName: string | null };
type ReportGroup = { id: string; name: string };
type ReportPerson = { email: string; name: string; statuses: Record<string, boolean | undefined> };
type ReportPreview = { dates: string[]; people: ReportPerson[]; selectedPerson: string | null };

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

export function AttendanceReportDownload({ groups, recipients }: { groups: ReportGroup[]; recipients: Recipient[] }) {
  const today = localDateValue();
  const [submissionId, setSubmissionId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();
  const [preview, setPreview] = useState<ReportPreview>();
  const [previewPending, setPreviewPending] = useState(false);
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const sortedRecipients = useMemo(() => [...recipients].sort((left, right) => displayName(left).localeCompare(displayName(right), "pl")), [recipients]);

  function selectReportTarget(value: string) {
    if (value.startsWith("group:")) {
      setGroupId(value.slice("group:".length));
      setSubmissionId("");
      return;
    }
    if (value.startsWith("person:")) {
      setSubmissionId(value.slice("person:".length));
      setGroupId("");
      return;
    }
    setGroupId("");
    setSubmissionId("");
  }

  useEffect(() => {
    const dialog = previewDialogRef.current;
    if (!dialog) return;
    if (preview && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    if (!preview && dialog.open) dialog.close();
  }, [preview]);

  function closeFromBackdrop(event: React.PointerEvent<HTMLDialogElement>) {
    const { bottom, left, right, top } = event.currentTarget.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) setPreview(undefined);
  }

  async function downloadReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/admin/attendance/report", {
        body: JSON.stringify({ dateFrom, dateTo, groupId: groupId || undefined, submissionId: submissionId || undefined }),
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

  async function previewReport() {
    setPreviewPending(true);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/admin/attendance/report", { body: JSON.stringify({ dateFrom, dateTo, groupId: groupId || undefined, preview: true, submissionId: submissionId || undefined }), headers: { "Content-Type": "application/json" }, method: "POST" });
      const body = await response.json() as { dates?: string[]; message?: string; people?: ReportPerson[]; selectedPerson?: string | null };
      if (!response.ok) throw new Error(body.message || "Nie udało się przygotować podglądu raportu.");
      const selectedRecipient = submissionId ? recipients.find((recipient) => recipient.id === submissionId) : undefined;
      const people = body.people || [];
      if (selectedRecipient && !people.some((person) => person.email === selectedRecipient.email)) {
        people.push({ email: selectedRecipient.email, name: displayName(selectedRecipient), statuses: {} });
      } else if (!submissionId) {
        const existingPeople = new Set(people.map((person) => person.email));
        for (const recipient of sortedRecipients) {
          if (!existingPeople.has(recipient.email)) people.push({ email: recipient.email, name: displayName(recipient), statuses: {} });
        }
      }
      setPreview({ dates: body.dates || [], people, selectedPerson: body.selectedPerson || submissionId || null });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się przygotować podglądu raportu." });
    } finally {
      setPreviewPending(false);
    }
  }

  return <section className="attendance-report-section">
    <h2>Sprawdź obecność</h2>
    <form className="attendance-report-download" onSubmit={downloadReport}>
      <div className="attendance-report-fields">
      <label>Dla kogo<select onChange={(event) => selectReportTarget(event.target.value)} value={groupId ? `group:${groupId}` : submissionId ? `person:${submissionId}` : ""}><option value="">Wszyscy uczestnicy</option>{groups.map((group) => <option key={`group-${group.id}`} value={`group:${group.id}`}>Grupa: {group.name}</option>)}{sortedRecipients.map((recipient) => <option key={`person-${recipient.id}`} value={`person:${recipient.id}`}>Osoba: {displayName(recipient)}</option>)}</select></label>
      <label>Data od<input onChange={(event) => setDateFrom(event.target.value)} required type="date" value={dateFrom} /></label>
      <label>Data do<input onChange={(event) => setDateTo(event.target.value)} required type="date" value={dateTo} /></label>
      </div>
      <div className="attendance-report-actions"><button disabled={previewPending || pending} onClick={() => void previewReport()} type="button">{previewPending ? "Wczytywanie…" : "Podgląd raportu"}</button><button disabled={pending || previewPending} type="submit">{pending ? "Pobieranie…" : "Pobierz raport"}</button></div>
      {feedback ? <span className={feedback.error ? "admin-download-feedback admin-download-feedback-error" : "admin-download-feedback"} role={feedback.error ? "alert" : "status"}>{feedback.message}</span> : null}
    </form>
    {preview ? <dialog aria-labelledby="attendance-report-preview-title" className="admin-modal attendance-report-preview" onCancel={() => setPreview(undefined)} onPointerDown={closeFromBackdrop} ref={previewDialogRef}><div className="attendance-report-preview-header"><div><h2 id="attendance-report-preview-title">Podgląd raportu</h2><p>{dateFrom} – {dateTo}</p></div><button onClick={() => setPreview(undefined)} type="button">Zamknij</button></div><div className="attendance-report-legend" aria-label="Legenda obecności"><span title="Obecny"><i className="attendance-legend-symbol attendance-legend-present">✓</i> Obecny</span><span title="Nieobecny"><i className="attendance-legend-symbol attendance-legend-absent">×</i> Nieobecny</span><span title="Brak przypisania do zajęć"><i className="attendance-legend-symbol attendance-legend-unassigned">−</i> Brak zajęć</span></div><div className="attendance-report-table-wrap"><table className="attendance-report-matrix"><thead><tr><th>Osoba</th>{preview.dates.map((date) => <th key={date}>{date}</th>)}</tr></thead><tbody>{preview.people.length === 0 ? <tr><td colSpan={Math.max(1, preview.dates.length + 1)}>Brak danych dla wybranych filtrów.</td></tr> : preview.people.map((person) => <tr key={person.email}><th scope="row"><strong>{person.name}</strong><small>{person.email}</small></th>{preview.dates.map((date) => { const status = person.statuses[date]; const label = status === undefined ? "Brak przypisania do zajęć" : status ? "Obecny" : "Nieobecny"; return <td className={status === undefined ? "attendance-matrix-unassigned" : status ? "attendance-matrix-present" : "attendance-matrix-absent"} key={date}><span aria-label={label} role="img" title={label}>{status === undefined ? "−" : status ? "✓" : "×"}</span></td>; })}</tr>)}</tbody></table></div></dialog> : null}
  </section>;
}
