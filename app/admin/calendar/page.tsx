import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { attendanceDateString, getAttendanceCalendarData, parseAttendanceWeek, shiftAttendanceWeek } from "@/lib/attendance";
import { AdminPanel } from "../admin-panel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { robots: { follow: false, index: false }, title: "Kalendarz · Panel administracyjny" };

type CalendarPageProps = { searchParams: Promise<{ week?: string }> };

const dayNames = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

function formatDay(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(value);
}

function weekLabel(start: Date) {
  const end = shiftAttendanceWeek(start, 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return `${formatDay(start)}–${formatDay(end)}`;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const config = getAdminAuthConfig();
  if (!config) return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  if (!(await getAdminSession())) redirect("/admin");

  const weekStart = parseAttendanceWeek((await searchParams).week);
  const activities = await getAttendanceCalendarData(weekStart);
  const previousWeek = attendanceDateString(shiftAttendanceWeek(weekStart, -1));
  const nextWeek = attendanceDateString(shiftAttendanceWeek(weekStart, 1));
  const currentWeek = attendanceDateString(parseAttendanceWeek(undefined));

  return <AdminPanel title="Kalendarz">
    <section className="admin-calendar-toolbar">
      <Link className="admin-secondary-button" href={`/admin/calendar?week=${previousWeek}`}>← Poprzedni tydzień</Link>
      <div><h2>{weekLabel(weekStart)}</h2><Link href={`/admin/calendar?week=${currentWeek}`}>Bieżący tydzień</Link></div>
      <Link className="admin-secondary-button" href={`/admin/calendar?week=${nextWeek}`}>Następny tydzień →</Link>
    </section>
    <div className="admin-calendar-grid">
      {dayNames.map((dayName, index) => {
        const day = new Date(weekStart);
        day.setUTCDate(day.getUTCDate() + index);
        const dayActivities = activities.filter((activity) => attendanceDateString(activity.activityDate) === attendanceDateString(day));
        return <section className="admin-calendar-day" key={dayName}>
          <header><h2>{dayName}</h2><p>{formatDay(day)}</p></header>
          {dayActivities.length === 0 ? <p className="admin-calendar-empty">Brak zajęć</p> : <div className="admin-calendar-activities">{dayActivities.map((activity) => {
            const present = activity.participants.filter((participant) => participant.present).length;
            return <Link className="admin-calendar-activity" href={`/admin/attendance?date=${attendanceDateString(activity.activityDate)}&activity=${encodeURIComponent(activity.id)}`} key={activity.id}><strong>{activity.name}</strong><span>{formatTime(activity.startsAt)}{activity.endsAt ? `–${formatTime(activity.endsAt)}` : ""}</span><small>{present}/{activity.participants.length} obecnych</small></Link>;
          })}</div>}
        </section>;
      })}
    </div>
  </AdminPanel>;
}
