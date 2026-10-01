import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { attendanceDateString, getAttendanceBoardData, parseAttendanceWeek, shiftAttendanceWeek } from "@/lib/attendance";
import { getContactGroups } from "@/lib/contact-groups";
import { AdminPanel } from "../admin-panel";
import { CalendarBoard } from "./calendar-board";
import { CalendarScroller } from "./calendar-scroller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { robots: { follow: false, index: false }, title: "Kalendarz · Panel administracyjny" };

type CalendarPageProps = { searchParams: Promise<{ week?: string }> };

function formatDay(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(value);
}

function weekLabel(start: Date) {
  const end = shiftAttendanceWeek(start, 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return `${formatDay(start)} – ${formatDay(end)}`;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const config = getAdminAuthConfig();
  if (!config) return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  if (!(await getAdminSession())) redirect("/admin");

  const weekStart = parseAttendanceWeek((await searchParams).week);
  const [activities, groups] = await Promise.all([getAttendanceBoardData(weekStart), getContactGroups()]);
  const previousWeek = attendanceDateString(shiftAttendanceWeek(weekStart, -1));
  const nextWeek = attendanceDateString(shiftAttendanceWeek(weekStart, 1));
  const currentWeek = attendanceDateString(parseAttendanceWeek(undefined));
  const currentDate = attendanceDateString(new Date());
  const totalActivities = activities.length;

  return <AdminPanel title="Kalendarz">
    <section className="admin-calendar-toolbar">
      <Link className="admin-secondary-button" href={`/admin/calendar?week=${previousWeek}`}>← Poprzedni tydzień</Link>
      <div className="admin-calendar-toolbar-week"><h2>{weekLabel(weekStart)}</h2><Link href={`/admin/calendar?week=${currentWeek}`}>Bieżący tydzień</Link></div>
      <Link className="admin-secondary-button" href={`/admin/calendar?week=${nextWeek}`}>Następny tydzień →</Link>
    </section>
    <section className="admin-submissions-intro">
      <p>Kliknij godzinę, aby dodać zajęcia, albo kliknij istniejące, aby je zmienić lub usunąć. Zajęcia można powtarzać co tydzień przez kilka tygodni.</p>
      <p>{totalActivities === 0 ? "W tym tygodniu nie ma jeszcze żadnych zajęć." : `W tym tygodniu zaplanowano ${totalActivities} zajęć.`}</p>
    </section>
    <CalendarScroller className="admin-calendar-board-wrap" currentDate={currentDate}>
      <CalendarBoard
        activities={activities.map((activity) => ({
          activityDate: activity.activityDate.toISOString(),
          endsAt: activity.endsAt?.toISOString() || null,
          id: activity.id,
          name: activity.name,
          participants: activity.participants,
          presentCount: activity.presentCount,
          seriesId: activity.seriesId,
          startsAt: activity.startsAt.toISOString(),
          totalParticipants: activity.totalParticipants,
        }))}
        currentDate={currentDate}
        groups={groups.map((group) => ({ id: group.id, name: group.name, submissionIds: group.memberships.map((membership) => membership.submissionId) }))}
        weekStart={attendanceDateString(weekStart)}
      />
    </CalendarScroller>
  </AdminPanel>;
}
