"use client";

import { useState } from "react";

type Recipient = { childName: string | null; email: string; id: string; parentName: string | null; phone: string | null };
type Group = { id: string; name: string; submissionIds: string[] };
type Participant = { present: boolean; submissionId: string };
type Activity = { activityDate: string; endsAt: string | null; groupId: string | null; groupIds?: string[]; id: string; name: string; participants: Participant[]; startsAt: string };
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
  if (activity.groupId) return groups.find((group) => group.id === activity.groupId);
  const participantIds = new Set(activity.participants.map((participant) => participant.submissionId));
  return groups
    .map((group) => ({ group, overlap: group.submissionIds.filter((id) => participantIds.has(id)).length }))
    .filter((entry) => entry.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap || left.group.submissionIds.length - right.group.submissionIds.length)[0]?.group;
}

function activityGroupIds(activity: Activity | undefined, groups: Group[]) {
  if (!activity) return [];
  const storedGroupIds = activity.groupIds?.filter((id) => groups.some((group) => group.id === id)) || [];
  if (storedGroupIds.length > 0) return storedGroupIds;
  const group = matchingGroup(activity, groups);
  return group ? [group.id] : [];
}

function activityLabel(activity: Activity) {
  return `${dateValue(activity.activityDate)} · ${timeValue(activity.startsAt)}${activity.endsAt ? `–${timeValue(activity.endsAt)}` : ""} · ${activity.name}`;
}

function nearestActivity(activities: Activity[], targetDate?: string) {
  if (!targetDate) {
    const now = Date.now();
    return [...activities].sort((left, right) => {
      const timeDistance = Math.abs(new Date(left.startsAt).getTime() - now) - Math.abs(new Date(right.startsAt).getTime() - now);
      return timeDistance || left.startsAt.localeCompare(right.startsAt) || left.id.localeCompare(right.id);
    })[0];
  }
  return [...activities].sort((left, right) => {
    const dateDistance = Math.abs(new Date(`${dateValue(left.activityDate)}T00:00:00Z`).getTime() - new Date(`${targetDate}T00:00:00Z`).getTime())
      - Math.abs(new Date(`${dateValue(right.activityDate)}T00:00:00Z`).getTime() - new Date(`${targetDate}T00:00:00Z`).getTime());
    return dateDistance || left.startsAt.localeCompare(right.startsAt) || left.id.localeCompare(right.id);
  })[0];
}

export function AttendanceManager({ activities: initialActivities, groups, recipients, selectedActivityId, selectedDate }: { activities: Activity[]; groups: Group[]; recipients: Recipient[]; selectedActivityId?: string; selectedDate?: string }) {
  const [activities, setActivities] = useState(initialActivities);
  const initialActivity = initialActivities.find((activity) => activity.id === selectedActivityId);
  const defaultActivity = initialActivity || nearestActivity(initialActivities, selectedDate);
  const initialGroupIds = activityGroupIds(initialActivity, groups);
  const [formMode, setFormMode] = useState<FormMode>("select");
  const [formActivityId, setFormActivityId] = useState(defaultActivity?.id || "");
  const [editingSelectedActivity, setEditingSelectedActivity] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [activityDate, setActivityDate] = useState(defaultActivity ? dateValue(defaultActivity.activityDate) : selectedDate || localDateValue());
  const [startsAt, setStartsAt] = useState(defaultActivity ? timeValue(defaultActivity.startsAt) : "16:00");
  const [endsAt, setEndsAt] = useState(defaultActivity?.endsAt ? timeValue(defaultActivity.endsAt) : addHour("16:00"));
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [name, setName] = useState(defaultActivity?.name || "");
  const [groupIds, setGroupIds] = useState(activityGroupIds(defaultActivity, groups).length ? activityGroupIds(defaultActivity, groups) : initialGroupIds);
  const [submissionIds, setSubmissionIds] = useState<string[]>(defaultActivity?.participants.map((participant) => participant.submissionId) || []);
  const [presentSubmissionIds, setPresentSubmissionIds] = useState<string[]>(defaultActivity?.participants.filter((participant) => participant.present).map((participant) => participant.submissionId) || []);
  const [pendingId, setPendingId] = useState<string>();
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();
  const [createdSuccess, setCreatedSuccess] = useState<{ id: string; name: string }>();

  function displayName(recipient: Recipient) { return recipient.childName || recipient.parentName || "Bez podanego imienia"; }
  function recipient(id: string) { return recipients.find((item) => item.id === id); }
  function toggleDraftAttendance(submissionId: string) {
    setPresentSubmissionIds((current) => current.includes(submissionId)
      ? current.filter((id) => id !== submissionId)
      : [...current, submissionId]);
  }

  function toggleAllDraftAttendance() {
    setPresentSubmissionIds((current) => current.length === selectedParticipants.length ? [] : selectedParticipants.map((item) => item.id));
  }

  function addExtraParticipant(id: string) {
    if (!id || submissionIds.includes(id)) return;
    setSubmissionIds((current) => [...current, id]);
    setPresentSubmissionIds((current) => current.filter((item) => item !== id));
    setShowAddParticipant(false);
  }

  function selectGroup(id: string) {
    if (!id) return;
    const group = groups.find((item) => item.id === id);
    if (!group || groupIds.includes(id)) return;
    const ids = [...groupIds, id];
    const participantIds = new Set([...submissionIds, ...group.submissionIds]);
    setGroupIds(ids);
    setSubmissionIds([...participantIds]);
    setPresentSubmissionIds([]);
    setShowParticipants(true);
  }

  function removeGroup(id: string) {
    const ids = groupIds.filter((groupId) => groupId !== id);
    const participantIds = new Set(ids.flatMap((groupId) => groups.find((group) => group.id === groupId)?.submissionIds || []));
    setGroupIds(ids);
    setSubmissionIds((current) => current.filter((submissionId) => participantIds.has(submissionId)));
    setPresentSubmissionIds((current) => current.filter((submissionId) => participantIds.has(submissionId)));
  }

  function applyActivity(activity: Activity) {
    const selectedGroupIds = activityGroupIds(activity, groups);
    setFormActivityId(activity.id);
    setActivityDate(dateValue(activity.activityDate));
    setStartsAt(timeValue(activity.startsAt));
    setEndsAt(activity.endsAt ? timeValue(activity.endsAt) : addHour(timeValue(activity.startsAt)));
    setName(activity.name);
    setGroupIds(selectedGroupIds);
    setSubmissionIds(activity.participants.map((participant) => participant.submissionId));
    setPresentSubmissionIds(activity.participants.filter((participant) => participant.present).map((participant) => participant.submissionId));
    setEditingSelectedActivity(false);
    setShowParticipants(true);
    setShowAddParticipant(false);
    setFeedback(undefined);
    setCreatedSuccess(undefined);
  }

  function startNewActivity() {
    setFormMode("new");
    setFormActivityId("");
    setEditingSelectedActivity(false);
    setShowParticipants(true);
    setShowAddParticipant(false);
    setActivityDate(selectedDate || localDateValue());
    setStartsAt("16:00");
    setEndsAt(addHour("16:00"));
    setRepeatWeeks(1);
    setName(nextLessonName(activities));
    setGroupIds([]);
    setSubmissionIds([]);
    setPresentSubmissionIds([]);
    setFeedback(undefined);
    setCreatedSuccess(undefined);
  }

  function startSelectingActivity() {
    const nextActivity = nearestActivity(activities, selectedDate);
    setFormMode("select");
    setFormActivityId(nextActivity?.id || "");
    setEditingSelectedActivity(false);
    setShowParticipants(true);
    setShowAddParticipant(false);
    setActivityDate(nextActivity ? dateValue(nextActivity.activityDate) : selectedDate || localDateValue());
    setStartsAt(nextActivity ? timeValue(nextActivity.startsAt) : "16:00");
    setEndsAt(nextActivity?.endsAt ? timeValue(nextActivity.endsAt) : nextActivity ? addHour(timeValue(nextActivity.startsAt)) : addHour("16:00"));
    setName(nextActivity?.name || "");
    setGroupIds(nextActivity ? activityGroupIds(nextActivity, groups) : []);
    setSubmissionIds(nextActivity?.participants.map((participant) => participant.submissionId) || []);
    setPresentSubmissionIds(nextActivity?.participants.filter((participant) => participant.present).map((participant) => participant.submissionId) || []);
    setFeedback(undefined);
  }

  const selectedParticipants = submissionIds
    .map((id) => recipient(id))
    .filter((item): item is Recipient => Boolean(item))
    .sort((left, right) => displayName(left).localeCompare(displayName(right), "pl"));
  const selectedFormActivity = activities.find((activity) => activity.id === formActivityId);
  const activityGroups = activities.reduce<Array<{ date: string; activities: Activity[] }>>((result, activity) => {
    const date = dateValue(activity.activityDate);
    const current = result[result.length - 1];
    if (current?.date === date) current.activities.push(activity);
    else result.push({ activities: [activity], date });
    return result;
  }, []);
  const availableExtraRecipients = recipients
    .filter((item) => !submissionIds.includes(item.id))
    .sort((left, right) => displayName(left).localeCompare(displayName(right), "pl"));

  async function createActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formMode === "select") {
      const selectedActivity = activities.find((activity) => activity.id === formActivityId);
      if (!selectedActivity) return;
      setPendingId(selectedActivity.id);
      setFeedback(undefined);
      try {
        const response = await fetch(`/api/admin/attendance/${encodeURIComponent(selectedActivity.id)}`, { body: JSON.stringify({ activityDate, endsAt, groupId: groupIds[0] || "", groupIds, name, participants: submissionIds.map((submissionId) => ({ present: presentSubmissionIds.includes(submissionId), submissionId })), startsAt }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
        const result = await response.json() as { message?: string };
        if (!response.ok) throw new Error(result.message || "Nie udało się zapisać zajęć.");
        const updatedActivity = { ...selectedActivity, activityDate: `${activityDate}T00:00:00.000Z`, endsAt: endsAt ? `${activityDate}T${endsAt}:00.000Z` : null, groupId: groupIds[0] || null, groupIds, name, participants: submissionIds.map((submissionId) => ({ present: presentSubmissionIds.includes(submissionId), submissionId })), startsAt: `${activityDate}T${startsAt}:00.000Z` };
        setActivities((current) => current.map((activity) => activity.id === updatedActivity.id ? updatedActivity : activity));
        setEditingSelectedActivity(false);
        setShowParticipants(true);
        setFeedback({ error: false, message: `Zapisano zajęcia: ${updatedActivity.name}.` });
      } catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się zapisać zajęć." }); }
      finally { setPendingId(undefined); }
      return;
    }

    setPendingId("new"); setFeedback(undefined);
    try {
       const response = await fetch("/api/admin/attendance", { body: JSON.stringify({ activityDate, endsAt, groupId: groupIds[0] || "", groupIds, name, participants: submissionIds.map((submissionId) => ({ present: presentSubmissionIds.includes(submissionId), submissionId })), repeatWeeks, startsAt }), headers: { "Content-Type": "application/json" }, method: "POST" });
      const result = await response.json() as { id?: string; message?: string };
       if (!response.ok || !result.id) throw new Error(result.message || "Nie udało się utworzyć zajęć.");
       const createdActivity = { activityDate: `${activityDate}T00:00:00.000Z`, endsAt: endsAt ? `${activityDate}T${endsAt}:00.000Z` : null, groupId: groupIds[0] || null, groupIds, id: result.id!, name, participants: submissionIds.map((id) => ({ present: presentSubmissionIds.includes(id), submissionId: id })), startsAt: `${activityDate}T${startsAt}:00.000Z` };
      setActivities((current) => [createdActivity, ...current]);
        setName(nextLessonName([createdActivity, ...activities])); setSubmissionIds([]); setPresentSubmissionIds([]); setGroupIds([]); setRepeatWeeks(1); setCreatedSuccess({ id: createdActivity.id, name: createdActivity.name }); setFeedback(undefined);
     } catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się utworzyć zajęć." }); }
    finally { setPendingId(undefined); }
  }

  async function deleteActivity(activity: Activity) {
    if (!window.confirm(`Usunąć zajęcia „${activity.name}”?`)) return false;
    setPendingId(activity.id);
    try {
      const response = await fetch(`/api/admin/attendance/${encodeURIComponent(activity.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Nie udało się usunąć zajęć.");
      setActivities((current) => current.filter((item) => item.id !== activity.id));
      return true;
    } catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się usunąć zajęć." }); }
    finally { setPendingId(undefined); }
    return false;
  }

  async function deleteSelectedActivity() {
    if (!selectedFormActivity) return;
    if (await deleteActivity(selectedFormActivity)) startSelectingActivity();
  }

  function selectCreatedActivity() {
    const activity = activities.find((item) => item.id === createdSuccess?.id);
    if (activity) applyActivity(activity);
    setFormMode("select");
    setCreatedSuccess(undefined);
  }

  return <>
     <form className="admin-form attendance-create-form" id="attendance-create-form" onSubmit={createActivity}>
       <div className="attendance-create-heading"><div><h2>{formMode === "new" ? "Nowe zajęcia" : "Wybierz zajęcia"}</h2><p>{formMode === "select" ? "Wybierz istniejące zajęcia, aby uzupełnić formularz i je zmodyfikować." : "Utwórz nowe zajęcia i przypisz do nich grupę."}</p></div>{formMode === "select" ? <button className="attendance-create-mode-button" onClick={startNewActivity} type="button">+ Nowe zajęcia</button> : <button className="attendance-create-mode-button" onClick={startSelectingActivity} type="button">Wybierz zajęcia</button>}</div>
        {formMode === "select" ? <label>Wybierz zajęcia<select className="attendance-activity-picker" onChange={(event) => { const selectedActivity = activities.find((activity) => activity.id === event.target.value); if (selectedActivity) applyActivity(selectedActivity); else setFormActivityId(""); }} required value={formActivityId}><option value="">Wybierz zajęcia</option>{activityGroups.map((group) => <optgroup key={group.date} label={group.date}>{group.activities.map((activity) => <option key={activity.id} value={activity.id}>{timeValue(activity.startsAt)}{activity.endsAt ? `–${timeValue(activity.endsAt)}` : ""} · {activity.name}</option>)}</optgroup>)}</select></label> : null}
       {formMode === "select" && formActivityId ? <div className="attendance-selected-section">
         {editingSelectedActivity ? <div className="attendance-selected-edit-fields"><label>Nazwa zajęć<input maxLength={160} onChange={(event) => setName(event.target.value)} required value={name} /></label>
           <div className="attendance-time-grid"><label>Data<input onChange={(event) => setActivityDate(event.target.value)} required type="date" value={activityDate} /></label><label>Od<input onChange={(event) => { const value = event.target.value; setStartsAt(value); setEndsAt(addHour(value)); }} required type="time" value={startsAt} /></label><label>Do<input onChange={(event) => setEndsAt(event.target.value)} type="time" value={endsAt} /></label></div>
            <label>Wybierz grupę<select aria-label="Wybierz grupę" className="attendance-group-picker" onChange={(event) => selectGroup(event.target.value)} required={groupIds.length === 0} value={groupIds[0] || ""}><option value="">Dodaj grupę</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="attendance-selected-groups">{groupIds.map((id) => <span key={id}>{groups.find((group) => group.id === id)?.name || "Niedostępna grupa"}<button aria-label={`Usuń grupę ${groups.find((group) => group.id === id)?.name || id}`} onClick={() => removeGroup(id)} type="button">×</button></span>)}</div></div> : <div className="attendance-selected-details"><div><strong>{name}</strong><span>{activityDate} · {startsAt}–{endsAt || "bez godziny końcowej"}</span><span>{groupIds.map((id) => groups.find((group) => group.id === id)?.name).filter(Boolean).join(", ") || "Grupa uczestników niedostępna"}</span></div><button className="attendance-edit-button" onClick={() => { setEditingSelectedActivity(true); setShowParticipants(true); }} type="button">Edytuj</button></div>}
        {groupIds.length > 0 && showParticipants ? <div className="attendance-create-people"><div className="attendance-create-people-heading"><strong>Uczestnicy</strong><span>{selectedParticipants.length}</span><button className="attendance-bulk-button" onClick={toggleAllDraftAttendance} type="button">{presentSubmissionIds.length === selectedParticipants.length ? "Wszyscy nieobecni" : "Wszyscy obecni"}</button></div>{selectedParticipants.length === 0 ? <p className="admin-submissions-empty">Wybrane grupy nie mają uczestników.</p> : selectedParticipants.map((item) => { const present = presentSubmissionIds.includes(item.id); return <div className={`attendance-create-person attendance-participant ${present ? "attendance-participant-present" : "attendance-participant-absent"}`} key={item.id}><span>{displayName(item)}<small>{item.email}</small></span><button aria-label={`Oznacz ${displayName(item)} jako ${present ? "nieobecnego" : "obecnego"}`} className={present ? "attendance-create-status attendance-create-status-present" : "attendance-create-status attendance-create-status-absent"} onClick={() => toggleDraftAttendance(item.id)} type="button">{present ? "Obecny" : "Nieobecny"}</button></div>; })}<div className="attendance-add-participant-row">{availableExtraRecipients.length > 0 ? <>{showAddParticipant ? <select aria-label="Dostępni uczestnicy spoza grupy" className="attendance-extra-participants-select" onChange={(event) => addExtraParticipant(event.target.value)} size={5} value=""><option disabled value="">Wybierz uczestnika</option>{availableExtraRecipients.map((item) => <option key={item.id} value={item.id}>{displayName(item)} · {item.email}</option>)}</select> : <button aria-label="Dodaj uczestnika spoza grupy" className="attendance-add-participant-button" onClick={() => setShowAddParticipant(true)} type="button">Dodaj uczestnika spoza grupy</button>}</> : null}</div></div> : null}
          <div className="attendance-selected-actions"><div className="attendance-selected-actions-left"><button disabled={pendingId !== undefined || !name.trim() || groupIds.length === 0 || submissionIds.length === 0 || !formActivityId} type="submit">{pendingId === formActivityId ? "Zapisywanie…" : "Zatwierdź zajęcia"}</button></div><div className="attendance-selected-actions-right"><button className="admin-destructive-button" disabled={pendingId !== undefined || !selectedFormActivity} onClick={() => void deleteSelectedActivity()} type="button">Usuń zajęcia</button></div></div>
       </div> : formMode === "select" ? null : <><label>Nazwa zajęć<input maxLength={160} onChange={(event) => setName(event.target.value)} required value={name} /></label>
       <div className="attendance-time-grid"><label>Data<input onChange={(event) => setActivityDate(event.target.value)} required type="date" value={activityDate} /></label><label>Od<input onChange={(event) => { const value = event.target.value; setStartsAt(value); setEndsAt(addHour(value)); }} required type="time" value={startsAt} /></label><label>Do<input onChange={(event) => setEndsAt(event.target.value)} type="time" value={endsAt} /></label></div>
        <label>Wybierz grupę<select aria-label="Wybierz grupę" className="attendance-group-picker" onChange={(event) => selectGroup(event.target.value)} required={groupIds.length === 0} value={groupIds[0] || ""}><option value="">Dodaj grupę</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="attendance-selected-groups">{groupIds.map((id) => <span key={id}>{groups.find((group) => group.id === id)?.name || "Niedostępna grupa"}<button aria-label={`Usuń grupę ${groups.find((group) => group.id === id)?.name || id}`} onClick={() => removeGroup(id)} type="button">×</button></span>)}</div>
         {groupIds.length > 0 ? <div className="attendance-create-people"><div className="attendance-create-people-heading"><strong>Uczestnicy</strong><span>{selectedParticipants.length}</span><button className="attendance-bulk-button" onClick={toggleAllDraftAttendance} type="button">{presentSubmissionIds.length === selectedParticipants.length ? "Wszyscy nieobecni" : "Wszyscy obecni"}</button></div>{selectedParticipants.length === 0 ? <p className="admin-submissions-empty">Wybrane grupy nie mają uczestników.</p> : selectedParticipants.map((item) => { const present = presentSubmissionIds.includes(item.id); return <div className={`attendance-create-person attendance-participant ${present ? "attendance-participant-present" : "attendance-participant-absent"}`} key={item.id}><span>{displayName(item)}<small>{item.email}</small></span><button aria-label={`Oznacz ${displayName(item)} jako ${present ? "nieobecnego" : "obecnego"}`} className={present ? "attendance-create-status attendance-create-status-present" : "attendance-create-status attendance-create-status-absent"} onClick={() => toggleDraftAttendance(item.id)} type="button">{present ? "Obecny" : "Nieobecny"}</button></div>; })}<div className="attendance-add-participant-row">{availableExtraRecipients.length > 0 ? <>{showAddParticipant ? <select aria-label="Dostępni uczestnicy spoza grupy" className="attendance-extra-participants-select" onChange={(event) => addExtraParticipant(event.target.value)} size={5} value=""><option disabled value="">Wybierz uczestnika</option>{availableExtraRecipients.map((item) => <option key={item.id} value={item.id}>{displayName(item)} · {item.email}</option>)}</select> : <button aria-label="Dodaj uczestnika spoza grupy" className="attendance-add-participant-button" onClick={() => setShowAddParticipant(true)} type="button">Dodaj uczestnika spoza grupy</button>}</> : null}</div></div> : null}
       <fieldset className="attendance-repeat-fields"><legend>Powtarzanie</legend><label><input checked={repeatWeeks === 1} name="attendance-repeat" onChange={() => setRepeatWeeks(1)} type="radio" /> Jednorazowo</label><label><input checked={repeatWeeks > 1} name="attendance-repeat" onChange={() => setRepeatWeeks(8)} type="radio" /> Co tydzień przez</label>{repeatWeeks > 1 ? <label>tygodni<input max={52} min={2} onChange={(event) => setRepeatWeeks(Math.max(2, Math.min(52, Number(event.target.value) || 2)))} type="number" value={repeatWeeks} /></label> : null}</fieldset>
         <button disabled={pendingId !== undefined || !name.trim() || groupIds.length === 0 || submissionIds.length === 0} type="submit">{pendingId === "new" ? "Zapisywanie…" : "Utwórz zajęcia"}</button></>}
    </form>
     {createdSuccess ? <p className="attendance-create-success" role="status"><strong>Zajęcia zostały utworzone pomyślnie</strong><a href="#attendance-create-form" onClick={(event) => { event.preventDefault(); selectCreatedActivity(); }}>Wybierz zajęcia: {createdSuccess.name}</a></p> : null}
     {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
  </>;
}
