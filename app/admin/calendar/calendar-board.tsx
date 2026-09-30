"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type CalendarBoardActivity = {
  activityDate: string;
  endsAt: string | null;
  id: string;
  name: string;
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
type DetailActivity = { endsAt: string; name: string; startsAt: string };
type DeleteScope = "future" | "series" | "single";

const dayNames = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const minimumBlockMinutes = 30;
const earliestHour = 7;
const latestHour = 22;

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

function nextLessonName(activities: CalendarBoardActivity[]) {
  const numbers = activities
    .map((activity) => /^Lekcja\s+(\d+)$/i.exec(activity.name)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number)
    .filter(Number.isSafeInteger);
  return `Lekcja ${(numbers.length ? Math.max(...numbers) : 0) + 1}`;
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
  const createTitleId = useId();
  const detailTitleId = useId();
  const [items, setItems] = useState(activities);
  const [prevActivities, setPrevActivities] = useState(activities);
  const [draft, setDraft] = useState<DraftActivity>();
  const [detail, setDetail] = useState<DetailActivity>();
  const [selectedId, setSelectedId] = useState<string>();
  const [deleteScope, setDeleteScope] = useState<DeleteScope>("single");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();
  const [pending, setPending] = useState(false);

  const days = useMemo(() => dayNames.map((_, index) => addDays(weekStart, index)), [weekStart]);
  const hours = useMemo(() => {
    const starts = items.map((activity) => minutesOfDay(activity.startsAt));
    const ends = items.map((activity) => minutesOfDay(activity.endsAt ?? activity.startsAt) + 30);
    const first = Math.max(0, Math.min(earliestHour, ...starts.map((minutes) => Math.floor(minutes / 60) - 1)));
    const last = Math.min(24, Math.max(latestHour, ...ends.map((minutes) => Math.ceil(minutes / 60))));
    return Array.from({ length: Math.max(1, last - first) }, (_, index) => first + index);
  }, [items]);
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
      startsAt: timeValue(activity.startsAt),
    });
  }

  async function createActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const group = groups.find((entry) => entry.id === draft?.groupId);
    if (!draft || !group || group.submissionIds.length === 0) return;
    setPending(true);
    setFeedback(undefined);
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
      setFeedback({ error: true, message: error instanceof Error ? error.message : "Nie udało się utworzyć zajęć." });
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
        body: JSON.stringify({ activityDate: dateValue(selectedActivity.activityDate), endsAt: detail.endsAt, name: detail.name, startsAt: detail.startsAt }),
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
      {days.map((day) => <div className="admin-calendar-board-column" data-calendar-date={day} key={day}>
        {hours.map((hour) => <button
          aria-label={`Dodaj zajęcia ${longDayFormatter.format(utcDate(day))} o ${hourLabel(hour)}`}
          className="admin-calendar-slot"
          key={hour}
          onClick={() => openCreate(day, hour)}
          type="button"
        />)}
        {items.filter((activity) => dateValue(activity.activityDate) === day).map((activity) => {
          const start = Math.max(rangeStart, minutesOfDay(activity.startsAt));
          const end = Math.max(start + minimumBlockMinutes, minutesOfDay(activity.endsAt ?? activity.startsAt));
          const summary = `${activity.name}, ${timeValue(activity.startsAt)}–${timeValue(activity.endsAt ?? activity.startsAt)}, ${activity.totalParticipants} osób${activity.presentCount ? `, ${activity.presentCount} obecnych` : ""}`;
          return <button
            aria-label={summary}
            className={`admin-calendar-block ${activity.seriesId ? "admin-calendar-block-series" : ""}`}
            key={activity.id}
            onClick={() => openDetail(activity)}
            style={{ height: `${((end - start) / rangeMinutes) * 100}%`, top: `${((start - rangeStart) / rangeMinutes) * 100}%` }}
            type="button"
          >
            <strong>{activity.name}</strong>
            <span>{timeValue(activity.startsAt)}{activity.endsAt ? `–${timeValue(activity.endsAt)}` : ""}</span>
            <small>{activity.totalParticipants} osób{activity.presentCount ? ` · ${activity.presentCount} obecnych` : ""}</small>
          </button>;
        })}
      </div>)}
    </div>
    {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}

    <dialog aria-labelledby={createTitleId} className="admin-modal" ref={createDialogRef}>
      {draft ? <form className="admin-form" onSubmit={createActivity}>
        <h2 id={createTitleId}>Nowe zajęcia</h2>
        <p className="admin-submissions-intro">{longDayFormatter.format(utcDate(draft.activityDate))}</p>
        <label>Nazwa zajęć<input maxLength={160} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required value={draft.name} /></label>
        <div className="attendance-time-grid">
          <label>Od<input onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} required type="time" value={draft.startsAt} /></label>
          <label>Do<input onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} type="time" value={draft.endsAt} /></label>
        </div>
        <label>Grupa<select onChange={(event) => setDraft({ ...draft, groupId: event.target.value })} required value={draft.groupId}>
          <option value="">Wybierz grupę</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.submissionIds.length})</option>)}
        </select></label>
        <fieldset className="admin-calendar-repeat">
          <legend>Powtarzanie</legend>
          <label><input checked={draft.repeatWeeks === 1} name="calendar-repeat" onChange={() => setDraft({ ...draft, repeatWeeks: 1 })} type="radio" /> Jednorazowo</label>
          <label><input checked={draft.repeatWeeks > 1} name="calendar-repeat" onChange={() => setDraft({ ...draft, repeatWeeks: 8 })} type="radio" /> Co tydzień przez</label>
          {draft.repeatWeeks > 1 ? <label>tygodni<input max={52} min={2} onChange={(event) => setDraft({ ...draft, repeatWeeks: Math.max(2, Math.min(52, Number(event.target.value) || 2)) })} type="number" value={draft.repeatWeeks} /></label> : null}
        </fieldset>
        {feedback ? <p className={feedback.error ? "admin-notice" : "admin-success"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
        <div className="admin-modal-actions">
          <button disabled={pending} onClick={() => setDraft(undefined)} type="button">Anuluj</button>
          <button disabled={pending || !draft.name.trim() || !draft.groupId} type="submit">{pending ? "Zapisywanie…" : "Zapisz zajęcia"}</button>
        </div>
      </form> : null}
    </dialog>

    <dialog aria-labelledby={detailTitleId} className="admin-modal" ref={detailDialogRef}>
      {detail && selectedActivity ? <div className="admin-form">
        <h2 id={detailTitleId}>{selectedActivity.name}</h2>
        <p className="admin-submissions-intro">{longDayFormatter.format(utcDate(selectedActivity.activityDate))} · {selectedActivity.totalParticipants} osób</p>
        <label>Nazwa zajęć<input maxLength={160} onChange={(event) => setDetail({ ...detail, name: event.target.value })} value={detail.name} /></label>
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
          <a className="admin-secondary-button" href={`/admin/attendance?date=${dateValue(selectedActivity.activityDate)}&activity=${encodeURIComponent(selectedActivity.id)}`}>Obecność</a>
          <button disabled={pending} onClick={() => void deleteActivity()} type="button">Usuń</button>
          <button disabled={pending} onClick={() => setDetail(undefined)} type="button">Anuluj</button>
          <button disabled={pending || !detail.name.trim()} onClick={() => void saveActivity()} type="button">Zapisz</button>
        </div>
      </div> : null}
    </dialog>
  </>;
}
