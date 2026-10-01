"use client";

import { useState } from "react";

type Recipient = { childName: string | null; email: string; id: string; parentName: string | null; phone: string | null };
type Group = { id: string; name: string; submissionIds: string[] };
type Participant = { present: boolean; submissionId: string };
type Activity = { activityDate: string; endsAt: string | null; id: string; name: string; participants: Participant[]; startsAt: string };
type FormMode = "new" | "select";

const dateValue = (value: string) => value.slice(0, 10);
const timeValue = (value: string) => value.slice(11, 16);
function localDateValue() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
function nextLessonName(activities: Activity[]) {
  const lessonNumbers = activities
    .map((activity) => /^Lekcja\s+(\d+)$/i.exec(activity.name)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .filter(Number.isSafeInteger);
  return `Lekcja ${(lessonNumbers.length ? Math.max(...lessonNumbers) : 0) + 1}`;
}
function addHour(time: string) { const [hours, minutes] = time.split(":").map(Number); return `${String((hours + 1) % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`; }
function matchingGroup(activity: Activity | undefined, groups: Group[]) {
  if (!activity) return undefined;
  const participantIds = new Set(activity.participants.map((participant) => participant.submissionId));
  return groups
    .filter((group) => group.submissionIds.length >= participantIds.size && [...participantIds].every((id) => group.submissionIds.includes(id)))
    .sort((left, right) => left.submissionIds.length - right.submissionIds.length)[0];
}

function activityLabel(activity: Activity) {
  return `${dateValue(activity.activityDate)} · ${timeValue(activity.startsAt)}${activity.endsAt ? `–${timeValue(activity.endsAt)}` : ""} · ${activity.name}`;
}

export function AttendanceManager({ activities: initialActivities, groups, recipients, selectedActivityId, selectedDate }: { activities: Activity[]; groups: Group[]; recipients: Recipient[]; selectedActivityId?: string; selectedDate?: string }) {
  const [activities, setActivities] = useState(initialActivities);
  const [savedParticipants, setSavedParticipants] = useState<Record<string, Participant[]>>(() => Object.fromEntries(initialActivities.map((activity) => [activity.id, activity.participants])));
  const initialActivity = initialActivities.find((activity) => activity.id === selectedActivityId);
  const initialGroup = matchingGroup(initialActivity, groups);
  const [formMode, setFormMode] = useState<FormMode>("select");
  const [formActivityId, setFormActivityId] = useState(selectedActivityId || "");
  const [editingSelectedActivity, setEditingSelectedActivity] = useState(false);
  const [showParticipants, setShowParticipants] = useState(!selectedActivityId);
  const [activityDate, setActivityDate] = useState(initialActivity ? dateValue(initialActivity.activityDate) : selectedDate || localDateValue);
  const [startsAt, setStartsAt] = useState(initialActivity ? timeValue(initialActivity.startsAt) : "16:00");
  const [endsAt, setEndsAt] = useState(initialActivity?.endsAt ? timeValue(initialActivity.endsAt) : addHour("16:00"));
  const [name, setName] = useState(initialActivity?.name || "");
  const [groupId, setGroupId] = useState(initialGroup?.id || "");
  const [submissionIds, setSubmissionIds] = useState<string[]>(initialActivity?.participants.map((participant) => participant.submissionId) || []);
  const [presentSubmissionIds, setPresentSubmissionIds] = useState<string[]>(initialActivity?.participants.filter((participant) => participant.present).map((participant) => participant.submissionId) || []);
  const [expandedActivityId, setExpandedActivityId] = useState<string | undefined>(selectedActivityId);
  const [pendingId, setPendingId] = useState<string>();
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();

  function displayName(recipient: Recipient) { return recipient.childName || recipient.parentName || "Bez podanego imienia"; }
  function recipient(id: string) { return recipients.find((item) => item.id === id); }
  function toggleAttendance(activityId: string, submissionId: string) {
    setActivities((current) => current.map((entry) => entry.id === activityId
      ? { ...entry, participants: entry.participants.map((row) => row.submissionId === submissionId ? { ...row, present: !row.present } : row) }
      : entry));
  }
  function toggleDraftAttendance(submissionId: string) {
    setPresentSubmissionIds((current) => current.includes(submissionId)
      ? current.filter((id) => id !== submissionId)
      : [...current, submissionId]);
  }

  function toggleAllDraftAttendance() {
    setPresentSubmissionIds((current) => current.length === selectedParticipants.length ? [] : selectedParticipants.map((item) => item.id));
  }

  function applyActivity(activity: Activity) {
    const group = matchingGroup(activity, groups);
    setFormActivityId(activity.id);
    setActivityDate(dateValue(activity.activityDate));
    setStartsAt(timeValue(activity.startsAt));
    setEndsAt(activity.endsAt ? timeValue(activity.endsAt) : addHour(timeValue(activity.startsAt)));
    setName(activity.name);
    setGroupId(group?.id || "");
    setSubmissionIds(activity.participants.map((participant) => participant.submissionId));
    setPresentSubmissionIds(activity.participants.filter((participant) => participant.present).map((participant) => participant.submissionId));
    setEditingSelectedActivity(false);
    setShowParticipants(false);
    setFeedback(undefined);
  }

  function startNewActivity() {
    setFormMode("new");
    setFormActivityId("");
    setEditingSelectedActivity(false);
    setShowParticipants(true);
    setStartsAt("16:00");
    setEndsAt(addHour("16:00"));
    setName(nextLessonName(activities));
    setGroupId("");
    setSubmissionIds([]);
    setPresentSubmissionIds([]);
    setFeedback(undefined);
  }

  function startSelectingActivity() {
    setFormMode("select");
    setFormActivityId("");
    setEditingSelectedActivity(false);
    setShowParticipants(true);
    setName("");
    setGroupId("");
    setSubmissionIds([]);
    setPresentSubmissionIds([]);
    setFeedback(undefined);
  }

  function hasAttendanceChanges(activity: Activity) {
    const saved = savedParticipants[activity.id];
    if (!saved || saved.length !== activity.participants.length) return true;
    const savedById = new Map(saved.map((participant) => [participant.submissionId, participant.present]));
    return activity.participants.some((participant) => savedById.get(participant.submissionId) !== participant.present);
  }
  function sortedParticipants(activity: Activity) {
    return [...activity.participants].sort((left, right) => {
      if (left.present !== right.present) return left.present ? -1 : 1;
      return displayName(recipient(left.submissionId) || { childName: null, email: "", id: left.submissionId, parentName: null, phone: null })
        .localeCompare(displayName(recipient(right.submissionId) || { childName: null, email: "", id: right.submissionId, parentName: null, phone: null }), "pl");
    });
  }

  const selectedParticipants = submissionIds
    .map((id) => recipient(id))
    .filter((item): item is Recipient => Boolean(item))
    .sort((left, right) => displayName(left).localeCompare(displayName(right), "pl"));
  const visibleActivities = activities.filter((activity) => dateValue(activity.activityDate) === activityDate);
  const selectedFormActivity = activities.find((activity) => activity.id === formActivityId);

  async function createActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formMode === "select") {
      const selectedActivity = activities.find((activity) => activity.id === formActivityId);
      if (!selectedActivity) return;
      setPendingId(selectedActivity.id);
      setFeedback(undefined);
      try {
        const response = await fetch(`/api/admin/attendance/${encodeURIComponent(selectedActivity.id)}`, { body: JSON.stringify({ activityDate, endsAt, name, participants: submissionIds.map((submissionId) => ({ present: presentSubmissionIds.includes(submissionId), submissionId })), startsAt }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
        const result = await response.json() as { message?: string };
        if (!response.ok) throw new Error(result.message || "Nie udało się zapisać zajęć.");
        const updatedActivity = { ...selectedActivity, activityDate: `${activityDate}T00:00:00.000Z`, endsAt: endsAt ? `${activityDate}T${endsAt}:00.000Z` : null, name, participants: submissionIds.map((submissionId) => ({ present: presentSubmissionIds.includes(submissionId), submissionId })), startsAt: `${activityDate}T${startsAt}:00.000Z` };
        setActivities((current) => current.map((activity) => activity.id === updatedActivity.id ? updatedActivity : activity));
        setSavedParticipants((current) => ({ ...current, [updatedActivity.id]: updatedActivity.participants }));
        setExpandedActivityId(updatedActivity.id);
        setEditingSelectedActivity(false);
        setShowParticipants(false);
        setFeedback({ error: false, message: `Zapisano zajęcia: ${updatedActivity.name}.` });
      } catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się zapisać zajęć." }); }
      finally { setPendingId(undefined); }
      return;
    }

    setPendingId("new"); setFeedback(undefined);
    try {
      const response = await fetch("/api/admin/attendance", { body: JSON.stringify({ activityDate, endsAt, name, participants: submissionIds.map((submissionId) => ({ present: presentSubmissionIds.includes(submissionId), submissionId })), startsAt }), headers: { "Content-Type": "application/json" }, method: "POST" });
      const result = await response.json() as { id?: string; message?: string };
       if (!response.ok || !result.id) throw new Error(result.message || "Nie udało się utworzyć zajęć.");
      const createdActivity = { activityDate: `${activityDate}T00:00:00.000Z`, endsAt: endsAt ? `${activityDate}T${endsAt}:00.000Z` : null, id: result.id!, name, participants: submissionIds.map((id) => ({ present: presentSubmissionIds.includes(id), submissionId: id })), startsAt: `${activityDate}T${startsAt}:00.000Z` };
      setActivities((current) => [createdActivity, ...current]);
      setExpandedActivityId(createdActivity.id);
      setSavedParticipants((current) => ({ ...current, [createdActivity.id]: createdActivity.participants }));
       setName(nextLessonName([createdActivity, ...activities])); setSubmissionIds([]); setPresentSubmissionIds([]); setGroupId(""); setFeedback({ error: false, message: "Zajęcia zostały utworzone." });
     } catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się utworzyć zajęć." }); }
    finally { setPendingId(undefined); }
  }

  async function saveActivity(activity: Activity) {
    setPendingId(activity.id); setFeedback(undefined);
    try {
      const response = await fetch(`/api/admin/attendance/${encodeURIComponent(activity.id)}`, { body: JSON.stringify({ activityDate: dateValue(activity.activityDate), endsAt: activity.endsAt ? timeValue(activity.endsAt) : "", name: activity.name, participants: activity.participants, startsAt: timeValue(activity.startsAt) }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
      const result = await response.json() as { message?: string };
       if (!response.ok) throw new Error(result.message || "Nie udało się zapisać zajęć.");
      setSavedParticipants((current) => ({ ...current, [activity.id]: activity.participants }));
      setFeedback({ error: false, message: `Zapisano obecność: ${activity.name}.` });
      } catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się zapisać zajęć." }); }
    finally { setPendingId(undefined); }
  }

  async function deleteActivity(activity: Activity) {
    if (!window.confirm(`Usunąć zajęcia „${activity.name}”?`)) return false;
    setPendingId(activity.id);
    try {
      const response = await fetch(`/api/admin/attendance/${encodeURIComponent(activity.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Nie udało się usunąć zajęć.");
      setActivities((current) => current.filter((item) => item.id !== activity.id));
      if (expandedActivityId === activity.id) setExpandedActivityId(undefined);
      return true;
    } catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się usunąć zajęć." }); }
    finally { setPendingId(undefined); }
    return false;
  }

  async function deleteSelectedActivity() {
    if (!selectedFormActivity) return;
    if (await deleteActivity(selectedFormActivity)) startSelectingActivity();
  }

  return <>
    <form className="admin-form attendance-create-form" onSubmit={createActivity}>
       <div className="attendance-create-heading"><div><h2>{formMode === "new" ? "Nowe zajęcia" : "Wybierz zajęcia"}</h2><p>{formMode === "select" ? "Wybierz istniejące zajęcia, aby uzupełnić formularz i je zmodyfikować." : "Utwórz nowe zajęcia i przypisz do nich grupę."}</p></div>{formMode === "select" ? <button className="attendance-create-mode-button" onClick={startNewActivity} type="button">+ Nowe zajęcia</button> : <button className="attendance-create-mode-button" onClick={startSelectingActivity} type="button">Wybierz zajęcia</button>}</div>
       {formMode === "select" ? <label>Wybierz zajęcia<select onChange={(event) => { const selectedActivity = activities.find((activity) => activity.id === event.target.value); if (selectedActivity) applyActivity(selectedActivity); else setFormActivityId(""); }} required value={formActivityId}><option value="">Wybierz zajęcia</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activityLabel(activity)}</option>)}</select></label> : null}
       {formMode === "select" && formActivityId && !editingSelectedActivity ? <div className="attendance-selected-details"><div><strong>{name}</strong><span>{activityDate} · {startsAt}–{endsAt || "bez godziny końcowej"}</span><span>{groups.find((group) => group.id === groupId)?.name || "Grupa uczestników niedostępna"}</span></div><button className="attendance-edit-button" onClick={() => { setEditingSelectedActivity(true); setShowParticipants(true); }} type="button">Edytuj</button></div> : <><label>Nazwa zajęć<input maxLength={160} onChange={(event) => setName(event.target.value)} required value={name} /></label>
       <div className="attendance-time-grid"><label>Data<input onChange={(event) => setActivityDate(event.target.value)} required type="date" value={activityDate} /></label><label>Od<input onChange={(event) => { const value = event.target.value; setStartsAt(value); setEndsAt(addHour(value)); }} required type="time" value={startsAt} /></label><label>Do<input onChange={(event) => setEndsAt(event.target.value)} type="time" value={endsAt} /></label></div>
       <label>Wybierz grupę<select onChange={(event) => { const value = event.target.value; const ids = groups.find((group) => group.id === value)?.submissionIds || []; setGroupId(value); setSubmissionIds(ids); setPresentSubmissionIds([]); setShowParticipants(true); }} required value={groupId}><option value="">Wybierz grupę</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></>}
       {groupId && showParticipants ? <div className="attendance-create-people"><div className="attendance-create-people-heading"><strong>Uczestnicy</strong><span>{selectedParticipants.length}</span><button className="attendance-bulk-button" onClick={toggleAllDraftAttendance} type="button">{presentSubmissionIds.length === selectedParticipants.length ? "Odznacz wszystkich" : "Zaznacz wszystkich obecnych"}</button></div>{selectedParticipants.length === 0 ? <p className="admin-submissions-empty">Wybrana grupa nie ma uczestników.</p> : selectedParticipants.map((item) => { const present = presentSubmissionIds.includes(item.id); return <div className={`attendance-create-person attendance-participant ${present ? "attendance-participant-present" : "attendance-participant-absent"}`} key={item.id}><span>{displayName(item)}<small>{item.email}</small></span><button aria-label={`Oznacz ${displayName(item)} jako ${present ? "nieobecnego" : "obecnego"}`} className={present ? "attendance-create-status attendance-create-status-present" : "attendance-create-status attendance-create-status-absent"} onClick={() => toggleDraftAttendance(item.id)} type="button">{present ? "Obecny" : "Nieobecny"}</button></div>; })}</div> : null}
       {formMode === "select" ? <div className="attendance-selected-actions"><div className="attendance-selected-actions-left"><button disabled={pendingId !== undefined || !name.trim() || !groupId || submissionIds.length === 0 || !formActivityId} type="submit">{pendingId === formActivityId ? "Zapisywanie…" : "Zatwierdź zajęcia"}</button></div><div className="attendance-selected-actions-right"><button className="admin-destructive-button" disabled={pendingId !== undefined || !selectedFormActivity} onClick={() => void deleteSelectedActivity()} type="button">Usuń zajęcia</button></div></div> : <button disabled={pendingId !== undefined || !name.trim() || !groupId || submissionIds.length === 0} type="submit">{pendingId === "new" ? "Zapisywanie…" : "Utwórz zajęcia"}</button>}
    </form>
    {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
    <div className="attendance-list">{visibleActivities.length === 0 ? <p className="admin-submissions-empty">Brak zajęć dla wybranej daty.</p> : visibleActivities.map((activity) => <details className={selectedActivityId === activity.id ? "attendance-card attendance-card-highlighted" : "attendance-card"} key={activity.id} open={expandedActivityId === activity.id} onToggle={(event) => setExpandedActivityId(event.currentTarget.open ? activity.id : undefined)}>
       <summary className="attendance-card-summary"><div className="attendance-card-summary-info"><h2>{activity.name}</h2><p>{dateValue(activity.activityDate)} · {timeValue(activity.startsAt)}{activity.endsAt ? `–${timeValue(activity.endsAt)}` : ""}</p></div><span aria-hidden="true" className="attendance-card-summary-toggle">+</span></summary>
       <div className="attendance-participants">{sortedParticipants(activity).map((participant) => { const item = recipient(participant.submissionId); if (!item) return null; const status = participant.present ? "Obecny" : "Nieobecny"; return <button aria-label={`${displayName(item)}, ${status}`} aria-pressed={participant.present} className={participant.present ? "attendance-participant attendance-participant-present" : "attendance-participant attendance-participant-absent"} key={participant.submissionId} onClick={() => toggleAttendance(activity.id, participant.submissionId)} type="button"><span>{displayName(item)}<small>{item.email}</small></span><strong aria-hidden="true">{participant.present ? "✓ Obecny" : "✕ Nieobecny"}</strong></button>; })}</div>
       <div className="attendance-card-footer">{hasAttendanceChanges(activity) ? <button className="admin-group-action-button attendance-update-button" disabled={pendingId === activity.id} onClick={() => saveActivity(activity)} type="button">{pendingId === activity.id ? "Zapisywanie…" : "Aktualizuj obecność"}</button> : null}<button className="admin-destructive-button attendance-delete-button" disabled={pendingId === activity.id} onClick={() => void deleteActivity(activity)} type="button">Usuń zajęcia</button><a className="admin-secondary-button attendance-calendar-link" href="/admin/calendar">Kalendarz</a></div>
     </details>)}</div>
  </>;
}
