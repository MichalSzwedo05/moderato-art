"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type CalendarBoardActivity = {
  activityDate: string;
  endsAt: string | null;
  groupId: string | null;
  id: string;
  name: string;
  participants: Array<{ childName: string | null; id: string; parentName: string | null; present: boolean }>;
  presentCount: number;
  seriesId: string | null;
  startsAt: string;
  totalParticipants: number;
};

export type CalendarBoardGroup = { id: string; name: string; submissionIds: string[] };

type CalendarBoardProps = {
  activities: CalendarBoardActivity[];
  currentDate: string;
  groups: CalendarBoardGroup[];
  weekStart: string;
};

type DraftActivity = { activityDate: string; endsAt: string; groupId: string; name: string; repeatWeeks: number; startsAt: string };
type DetailActivity = { endsAt: string; name: string; nameEditable: boolean; startsAt: string };
type DeleteScope = "future" | "series" | "single";
type CreateField = "endsAt" | "groupId" | "name" | "repeatWeeks" | "startsAt";
type CreateFieldErrors = Partial<Record<CreateField, string>>;

const dayNames = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const minimumBlockMinutes = 30;
const defaultStartHour = 9;
const defaultEndHour = 19;

const shortDayFormatter = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const longDayFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "full", timeZone: "UTC" });

function addDays(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

function utcDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function minutesOfDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function timeValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function dateValue(value: string) {
  return value.slice(0, 10);
}

function addHour(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${String((hours + 1) % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function timeMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

function nextLessonName(activities: CalendarBoardActivity[]) {
  const numbers = activities
    .map((activity) => /^Lekcja\s+(\d+)$/i.exec(activity.name)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .filter(Number.isSafeInteger);
  return `Lekcja ${(numbers.length ? Math.max(...numbers) : 0) + 1}`;
}

function participantName(participant: CalendarBoardActivity["participants"][number]) {
  return participant.childName || participant.parentName || "Bez podanego imienia";
}

function sortParticipants(participants: CalendarBoardActivity["participants"]) {
  return [...participants].sort((left, right) => {
    if (left.present !== right.present) return left.present ? -1 : 1;
    return participantName(left).localeCompare(participantName(right), "pl");
  });
}

function activityGroupName(activity: CalendarBoardActivity, groups: CalendarBoardGroup[]) {
  if (activity.groupId) return groups.find((group) => group.id === activity.groupId)?.name;
  const participantIds = new Set(activity.participants.map((participant) => participant.id));
  return groups
    .map((group) => ({ group, overlap: group.submissionIds.filter((id) => participantIds.has(id)).length }))
    .filter((entry) => entry.overlap > 0)
    .sort((left, right) => right.overlap - left.overlap || left.group.submissionIds.length - right.group.submissionIds.length)[0]?.group.name;
}

function getCalendarHours(activities: CalendarBoardActivity[]) {
  if (activities.length === 0) return Array.from({ length: defaultEndHour - defaultStartHour + 1 }, (_, index) => defaultStartHour + index);
  const starts = activities.map((activity) => minutesOfDay(activity.startsAt));
  const ends = activities.map(activityEndMinutes);
  const first = Math.max(0, Math.min(...starts.map((minutes) => Math.floor(minutes / 60))));
  const last = Math.min(24, Math.max(first + 1, ...ends.map((minutes) => Math.ceil(minutes / 60))));
  return Array.from({ length: Math.max(1, last - first) }, (_, index) => first + index);
}

function activityEndMinutes(activity: CalendarBoardActivity) {
  return Math.max(minutesOfDay(activity.startsAt) + minimumBlockMinutes, minutesOfDay(activity.endsAt ?? activity.startsAt));
}

function layoutActivities(activities: CalendarBoardActivity[]) {
  const sorted = [...activities].sort((left, right) => minutesOfDay(left.startsAt) - minutesOfDay(right.startsAt) || activityEndMinutes(right) - activityEndMinutes(left) || left.id.localeCompare(right.id));
  const layouts = new Map<string, { lane: number; laneCount: number }>();
  let cluster: CalendarBoardActivity[] = [];
  let clusterEnd = -1;

  function layoutCluster(current: CalendarBoardActivity[]) {
    const laneEnds: number[] = [];
    const assigned: Array<{ activity: CalendarBoardActivity; lane: number }> = [];
    for (const activity of current) {
      const start = minutesOfDay(activity.startsAt);
      const lane = laneEnds.findIndex((end) => end <= start);
      const nextLane = lane === -1 ? laneEnds.length : lane;
      laneEnds[nextLane] = activityEndMinutes(activity);
      assigned.push({ activity, lane: nextLane });
    }
    assigned.forEach(({ activity, lane }) => layouts.set(activity.id, { lane, laneCount: laneEnds.length }));
  }

  for (const activity of sorted) {
    const start = minutesOfDay(activity.startsAt);
    if (cluster.length > 0 && start >= clusterEnd) {
      layoutCluster(cluster);
      cluster = [];
      clusterEnd = -1;
    }
    cluster.push(activity);
    clusterEnd = Math.max(clusterEnd, activityEndMinutes(activity));
  }
  if (cluster.length > 0) layoutCluster(cluster);
  return layouts;
}

async function readError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export function CalendarBoard({ activities, currentDate, groups, weekStart }: CalendarBoardProps) {
  const router = useRouter();
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const detailNameInputRef = useRef<HTMLInputElement>(null);
  const createTitleId = useId();
  const detailTitleId = useId();
  const [items, setItems] = useState(activities);
  const [prevActivities, setPrevActivities] = useState(activities);
  const [draft, setDraft] = useState<DraftActivity>();
  const [detail, setDetail] = useState<DetailActivity>();
  const [selectedId, setSelectedId] = useState<string>();
  const [deleteScope, setDeleteScope] = useState<DeleteScope>("single");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();
  const [createError, setCreateError] = useState<string>();
  const [createFieldErrors, setCreateFieldErrors] = useState<CreateFieldErrors>({});
  const [pending, setPending] = useState(false);

  const days = useMemo(() => dayNames.map((_, index) => addDays(weekStart, index)), [weekStart]);
  const hours = useMemo(() => getCalendarHours(items), [items]);
  const rangeStart = hours[0] * 60;
  const rangeMinutes = hours.length * 60;

  const selectedActivity = items.find((activity) => activity.id === selectedId);

  if (activities !== prevActivities) {
    setPrevActivities(activities);
    setItems(activities);
  }

  useEffect(() => {
    const dialog = createDialogRef.current;
    if (!dialog) return;
    if (draft && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    if (!draft && dialog.open) dialog.close();
  }, [draft]);

  useEffect(() => {
    const dialog = detailDialogRef.current;
    if (!dialog) return;
    if (detail && selectedActivity && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    if ((!detail || !selectedActivity) && dialog.open) dialog.close();
  }, [detail, selectedActivity]);

  function openCreate(day: string, hour: number) {
    setFeedback(undefined);
    setCreateError(undefined);
    setCreateFieldErrors({});
    setDraft({
      activityDate: day,
      endsAt: addHour(hourLabel(hour)),
      groupId: "",
      name: nextLessonName(items),
      repeatWeeks: 1,
      startsAt: hourLabel(hour),
    });
  }

  function openDetail(activity: CalendarBoardActivity) {
    setFeedback(undefined);
    setSelectedId(activity.id);
    setDeleteScope("single");
    setDetail({
      endsAt: activity.endsAt ? timeValue(activity.endsAt) : addHour(timeValue(activity.startsAt)),
      name: activity.name,
      nameEditable: false,
      startsAt: timeValue(activity.startsAt),
    });
  }

  function closeFromBackdrop(event: React.PointerEvent<HTMLDialogElement>, close: () => void) {
    const { bottom, left, right, top } = event.currentTarget.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) close();
  }

  function updateDraft(patch: Partial<DraftActivity>, field?: CreateField) {
    setDraft((current) => current ? { ...current, ...patch } : current);
    if (field) {
      setCreateFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
    setCreateError(undefined);
  }

  function focusCreateField(field: CreateField | undefined) {
    if (!field) return;
    document.getElementById(`calendar-create-${field}`)?.focus();
  }

  function validateCreateDraft(currentDraft: DraftActivity, group?: CalendarBoardGroup) {
    const errors: CreateFieldErrors = {};
    const startsAt = timeMinutes(currentDraft.startsAt);
    const endsAt = timeMinutes(currentDraft.endsAt);

    if (!currentDraft.name.trim()) errors.name = "Wpisz nazwę zajęć.";
    if (startsAt === undefined) errors.startsAt = "Podaj prawidłową godzinę rozpoczęcia.";
    if (endsAt === undefined) errors.endsAt = "Podaj prawidłową godzinę zakończenia.";
    if (startsAt !== undefined && endsAt !== undefined && endsAt <= startsAt) {
      errors.endsAt = "Godzina zakończenia musi być późniejsza niż rozpoczęcia.";
    }
    if (!currentDraft.groupId) errors.groupId = "Wybierz grupę uczestników.";
    else if (!group || group.submissionIds.length === 0) errors.groupId = "Wybrana grupa nie ma zapisanych uczestników.";
    if (!Number.isInteger(currentDraft.repeatWeeks) || currentDraft.repeatWeeks < 1 || currentDraft.repeatWeeks > 52) {
      errors.repeatWeeks = "Podaj liczbę tygodni od 1 do 52.";
    }

    return errors;
  }

  function serverCreateError(message: string) {
    if (message.includes("koliduje z zajęciami")) return { endsAt: "Termin nakłada się na inne zajęcia. Zmień godzinę rozpoczęcia lub zakończenia." } satisfies CreateFieldErrors;
    if (message.includes("prawidłowe godziny")) return { endsAt: "Sprawdź godziny rozpoczęcia i zakończenia." } satisfies CreateFieldErrors;
    if (message.includes("Uzupełnij dane") || message.includes("wybranej osoby")) return { groupId: "Wybierz grupę z zapisanymi uczestnikami." } satisfies CreateFieldErrors;
    if (message.includes("już istnieje")) return { name: "Zajęcia o tej nazwie już istnieją w wybranym terminie." } satisfies CreateFieldErrors;
    return {} satisfies CreateFieldErrors;
  }

  async function createActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const group = groups.find((entry) => entry.id === draft?.groupId);
    if (!draft) return;
    const validationErrors = validateCreateDraft(draft, group);
    if (Object.keys(validationErrors).length > 0) {
      setCreateFieldErrors(validationErrors);
      setCreateError("Nie można utworzyć zajęć. Uzupełnij lub popraw zaznaczone pola.");
      focusCreateField(Object.keys(validationErrors)[0] as CreateField | undefined);
      return;
    }
    if (!group) return;
    setPending(true);
    setFeedback(undefined);
    setCreateError(undefined);
    setCreateFieldErrors({});
    try {
      const response = await fetch("/api/admin/attendance", {
        body: JSON.stringify({
          activityDate: draft.activityDate,
          endsAt: draft.endsAt,
          name: draft.name,
          participants: group.submissionIds.map((submissionId) => ({ present: false, submissionId })),
          repeatWeeks: draft.repeatWeeks,
          startsAt: draft.startsAt,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await response.json() as { message?: string; skippedDates?: string[] };
      if (!response.ok) throw new Error(body.message || "Nie udało się utworzyć zajęć.");
      setDraft(undefined);
      router.refresh();
      const created = draft.repeatWeeks;
      setFeedback({
        error: false,
        message: body.skippedDates?.length
          ? `Utworzono ${created - body.skippedDates.length} z ${created} zajęć. Pominięto daty z istniejącą już aktywnością: ${body.skippedDates.join(", ")}.`
          : created > 1 ? `Utworzono ${created} zajęć, jedno po drugim w kolejnych tygodniach.` : "Zajęcia zostały utworzone.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się utworzyć zajęć.";
      const fieldErrors = serverCreateError(message);
      setCreateFieldErrors(fieldErrors);
      setCreateError(message);
      focusCreateField(Object.keys(fieldErrors)[0] as CreateField | undefined);
    } finally {
      setPending(false);
    }
  }

  async function saveActivity() {
    if (!detail || !selectedActivity) return;
    setPending(true);
    setFeedback(undefined);
    try {
      const response = await fetch(`/api/admin/attendance/${encodeURIComponent(selectedActivity.id)}`, {
        body: JSON.stringify({ activityDate: dateValue(selectedActivity.activityDate), endsAt: detail.endsAt, groupId: selectedActivity.groupId || "", name: detail.name, startsAt: detail.startsAt }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error(await readError(response, "Nie udało się zapisać zajęć."));
      setItems((current) => current.map((activity) => activity.id === selectedActivity.id
        ? { ...activity, endsAt: `${dateValue(activity.activityDate)}T${detail.endsAt}:00.000Z`, name: detail.name, startsAt: `${dateValue(activity.activityDate)}T${detail.startsAt}:00.000Z` }
        : activity));
      setDetail(undefined);
      router.refresh();
      setFeedback({ error: false, message: "Zapisano zmiany." });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się zapisać zajęć." });
    } finally {
      setPending(false);
    }
  }

  async function deleteActivity() {
    if (!detail || !selectedActivity) return;
    setPending(true);
    setFeedback(undefined);
    try {
      const response = await fetch(`/api/admin/attendance/${encodeURIComponent(selectedActivity.id)}?scope=${deleteScope}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response, "Nie udało się usunąć zajęć."));
      const body = await response.json().catch(() => ({ deleted: 1 })) as { deleted?: number };
      setItems((current) => current.filter((activity) => {
        if (activity.id === selectedActivity.id) return false;
        if (deleteScope === "single" || !activity.seriesId || activity.seriesId !== selectedActivity.seriesId) return true;
        return deleteScope === "future" && dateValue(activity.activityDate) < dateValue(selectedActivity.activityDate);
      }));
      setDetail(undefined);
      router.refresh();
      setFeedback({ error: false, message: deleteScope === "single" ? "Usunięto zajęcia." : `Usunięto ${body.deleted ?? 0} zajęć.` });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się usunąć zajęć." });
    } finally {
      setPending(false);
    }
  }

  return <>
    <div className="admin-calendar-board">
      <div className="admin-calendar-board-corner" aria-hidden="true" />
      {days.map((day, index) => <div className={`admin-calendar-board-day ${day === currentDate ? "admin-calendar-board-day-today" : ""}`} data-calendar-date={day} key={day}>
        <strong>{dayNames[index]}</strong>
        <span>{shortDayFormatter.format(utcDate(day))}</span>
      </div>)}
      <div className="admin-calendar-board-gutter" aria-hidden="true">
        {hours.map((hour) => <span key={hour}>{hourLabel(hour)}</span>)}
      </div>
      {days.map((day) => {
        const dayActivities = items.filter((activity) => dateValue(activity.activityDate) === day);
        const activityLayouts = layoutActivities(dayActivities);
        return <div className={`admin-calendar-board-column ${day === currentDate ? "admin-calendar-board-column-today" : ""}`} data-calendar-date={day} key={day}>
        {hours.map((hour) => <button
          aria-label={`Dodaj zajęcia ${longDayFormatter.format(utcDate(day))} o ${hourLabel(hour)}`}
          className="admin-calendar-slot"
          key={hour}
          onClick={() => openCreate(day, hour)}
          type="button"
        />)}
        {dayActivities.map((activity) => {
          const start = Math.max(rangeStart, minutesOfDay(activity.startsAt));
          const end = Math.max(start + minimumBlockMinutes, minutesOfDay(activity.endsAt ?? activity.startsAt));
          const layout = activityLayouts.get(activity.id) || { lane: 0, laneCount: 1 };
          const laneWidth = 100 / layout.laneCount;
          const compact = end - start <= 60;
          const summary = `${activity.name}, ${timeValue(activity.startsAt)}–${timeValue(activity.endsAt ?? activity.startsAt)}, ${activity.totalParticipants} osób${activity.presentCount ? `, ${activity.presentCount} obecnych` : ""}`;
          return <button
            aria-label={summary}
             className={`admin-calendar-block ${compact ? "admin-calendar-block-compact" : ""} ${layout.laneCount > 1 ? "admin-calendar-block-laned" : ""} ${activity.seriesId ? "admin-calendar-block-series" : ""}`}
             key={activity.id}
             onClick={() => openDetail(activity)}
             style={{ height: `${((end - start) / rangeMinutes) * 100}%`, left: layout.laneCount > 1 ? `calc(${layout.lane * laneWidth}% + 2px)` : undefined, right: layout.laneCount > 1 ? "auto" : undefined, top: `${((start - rangeStart) / rangeMinutes) * 100}%`, width: layout.laneCount > 1 ? `calc(${laneWidth}% - 4px)` : undefined }}
             title={summary}
             type="button"
          >
            <strong>{activity.name}</strong>
            <span>{timeValue(activity.startsAt)}{activity.endsAt ? `–${timeValue(activity.endsAt)}` : ""}</span>
            <small>{activity.totalParticipants} osób{activity.presentCount ? ` · ${activity.presentCount} obecnych` : ""}</small>
          </button>;
        })}
      </div>;
      })}
    </div>
    {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}

    <dialog aria-labelledby={createTitleId} className="admin-modal" onPointerDown={(event) => closeFromBackdrop(event, () => setDraft(undefined))} ref={createDialogRef}>
      {draft ? <form className="admin-form" noValidate onSubmit={createActivity}>
        <h2 id={createTitleId}>Nowe zajęcia</h2>
        <p className="admin-submissions-intro">{longDayFormatter.format(utcDate(draft.activityDate))}</p>
        <label className={createFieldErrors.name ? "calendar-field-error" : undefined} htmlFor="calendar-create-name">Nazwa zajęć<input aria-describedby={createFieldErrors.name ? "calendar-create-name-error" : undefined} aria-invalid={Boolean(createFieldErrors.name)} id="calendar-create-name" maxLength={160} onChange={(event) => updateDraft({ name: event.target.value }, "name")} value={draft.name} />{createFieldErrors.name ? <span className="admin-field-error" id="calendar-create-name-error">{createFieldErrors.name}</span> : null}</label>
        <div className="attendance-time-grid">
          <label className={createFieldErrors.startsAt ? "calendar-field-error" : undefined} htmlFor="calendar-create-startsAt">Od<input aria-describedby={createFieldErrors.startsAt ? "calendar-create-startsAt-error" : undefined} aria-invalid={Boolean(createFieldErrors.startsAt)} id="calendar-create-startsAt" onChange={(event) => updateDraft({ startsAt: event.target.value }, "startsAt")} type="time" value={draft.startsAt} />{createFieldErrors.startsAt ? <span className="admin-field-error" id="calendar-create-startsAt-error">{createFieldErrors.startsAt}</span> : null}</label>
          <label className={createFieldErrors.endsAt ? "calendar-field-error" : undefined} htmlFor="calendar-create-endsAt">Do<input aria-describedby={createFieldErrors.endsAt ? "calendar-create-endsAt-error" : undefined} aria-invalid={Boolean(createFieldErrors.endsAt)} id="calendar-create-endsAt" onChange={(event) => updateDraft({ endsAt: event.target.value }, "endsAt")} type="time" value={draft.endsAt} />{createFieldErrors.endsAt ? <span className="admin-field-error" id="calendar-create-endsAt-error">{createFieldErrors.endsAt}</span> : null}</label>
        </div>
        <label className={createFieldErrors.groupId ? "calendar-field-error" : undefined} htmlFor="calendar-create-group">Grupa<select aria-describedby={createFieldErrors.groupId ? "calendar-create-group-error" : undefined} aria-invalid={Boolean(createFieldErrors.groupId)} id="calendar-create-group" onChange={(event) => updateDraft({ groupId: event.target.value }, "groupId")} value={draft.groupId}>
          <option value="">Wybierz grupę</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.submissionIds.length})</option>)}
        </select>{createFieldErrors.groupId ? <span className="admin-field-error" id="calendar-create-group-error">{createFieldErrors.groupId}</span> : null}</label>
        <fieldset className="admin-calendar-repeat">
          <legend>Powtarzanie</legend>
          <label><input checked={draft.repeatWeeks === 1} name="calendar-repeat" onChange={() => setDraft({ ...draft, repeatWeeks: 1 })} type="radio" /> Jednorazowo</label>
          <label><input checked={draft.repeatWeeks > 1} name="calendar-repeat" onChange={() => setDraft({ ...draft, repeatWeeks: 8 })} type="radio" /> Co tydzień przez</label>
          {draft.repeatWeeks > 1 ? <label className={createFieldErrors.repeatWeeks ? "calendar-field-error" : undefined} htmlFor="calendar-create-repeatWeeks">tygodni<input aria-describedby={createFieldErrors.repeatWeeks ? "calendar-create-repeatWeeks-error" : undefined} aria-invalid={Boolean(createFieldErrors.repeatWeeks)} id="calendar-create-repeatWeeks" max={52} min={2} onChange={(event) => updateDraft({ repeatWeeks: Number(event.target.value) }, "repeatWeeks")} type="number" value={draft.repeatWeeks} />{createFieldErrors.repeatWeeks ? <span className="admin-field-error" id="calendar-create-repeatWeeks-error">{createFieldErrors.repeatWeeks}</span> : null}</label> : null}
        </fieldset>
        {createError ? <p className="admin-notice admin-form-error" role="alert">{createError}</p> : null}
        <div className="admin-calendar-create-actions">
          <button disabled={pending} type="submit">{pending ? "Zapisywanie…" : "Zapisz zajęcia"}</button>
          <button disabled={pending} onClick={() => setDraft(undefined)} type="button">Anuluj</button>
        </div>
      </form> : null}
    </dialog>

    <dialog aria-labelledby={detailTitleId} className="admin-modal" onPointerDown={(event) => closeFromBackdrop(event, () => setDetail(undefined))} ref={detailDialogRef}>
      {detail && selectedActivity ? <div className="admin-form">
        <h2 id={detailTitleId}>{selectedActivity.name}</h2>
        <p className="admin-submissions-intro">{longDayFormatter.format(utcDate(selectedActivity.activityDate))} · {selectedActivity.totalParticipants} osób</p>
        <p className="admin-calendar-detail-group"><strong>Grupa:</strong> {activityGroupName(selectedActivity, groups) || "Nie przypisano grupy"}</p>
        <label>Nazwa zajęć{detail.nameEditable ? <input autoFocus maxLength={160} onChange={(event) => setDetail({ ...detail, name: event.target.value })} ref={detailNameInputRef} value={detail.name} /> : <button className="admin-calendar-detail-name-trigger" onClick={() => setDetail({ ...detail, nameEditable: true })} type="button">{detail.name}</button>}</label>
        <div aria-label="Lista obecności" className="attendance-selected-status calendar-attendance-status" role="region"><div className="attendance-selected-status-heading"><div className="calendar-attendance-status-title"><strong>Lista obecności</strong><span>Uczestnicy zajęć</span></div><span className="calendar-attendance-status-count">{selectedActivity.presentCount}/{selectedActivity.totalParticipants} obecnych</span></div>{selectedActivity.participants.length === 0 ? <p className="admin-submissions-empty">Brak uczestników.</p> : <div className="attendance-selected-status-list calendar-attendance-status-list">{sortParticipants(selectedActivity.participants).map((participant) => <div className={`calendar-attendance-status-row ${participant.present ? "calendar-attendance-status-row-present" : "calendar-attendance-status-row-absent"}`} key={participant.id}><span className="calendar-attendance-status-person"><i aria-hidden="true" />{participantName(participant)}</span><strong className="calendar-attendance-status-badge">{participant.present ? "Obecny" : "Nieobecny"}</strong></div>)}</div>}</div>
        <div className="attendance-time-grid">
          <label>Od<input onChange={(event) => setDetail({ ...detail, startsAt: event.target.value })} type="time" value={detail.startsAt} /></label>
          <label>Do<input onChange={(event) => setDetail({ ...detail, endsAt: event.target.value })} type="time" value={detail.endsAt} /></label>
        </div>
        {selectedActivity.seriesId ? <label>Usuń<select onChange={(event) => setDeleteScope(event.target.value as DeleteScope)} value={deleteScope}>
          <option value="single">Tylko te zajęcia</option>
          <option value="series">Całą serię powtórzeń</option>
          <option value="future">Te i wszystkie kolejne powtórzenia</option>
        </select></label> : null}
        {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
        <div className="admin-modal-actions">
          <div className="admin-modal-actions-group">
            <a className="admin-secondary-button" href={`/admin/attendance?date=${dateValue(selectedActivity.activityDate)}&activity=${encodeURIComponent(selectedActivity.id)}`}>Obecność</a>
            <button disabled={pending} onClick={() => setDetail(undefined)} type="button">Anuluj</button>
          </div>
          <div className="admin-modal-actions-group">
            <button className="admin-destructive-button" disabled={pending} onClick={() => void deleteActivity()} type="button">Usuń</button>
            <button disabled={pending || !detail.name.trim()} onClick={() => void saveActivity()} type="button">Zatwierdź</button>
          </div>
        </div>
      </div> : null}
    </dialog>
  </>;
}
