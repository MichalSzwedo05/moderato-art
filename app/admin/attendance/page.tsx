import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { getAttendanceData } from "@/lib/attendance";
import { getContactGroups } from "@/lib/contact-groups";
import { AdminPanel } from "../admin-panel";
import { AttendanceManager } from "./attendance-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { robots: { follow: false, index: false }, title: "Obecność · Panel administracyjny" };

export default async function AttendancePage() {
  const config = getAdminAuthConfig();
  if (!config) return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  if (!(await getAdminSession())) redirect("/admin");

  const result = await Promise.allSettled([getAttendanceData(), getContactGroups()]);
  if (result.some((item) => item.status === "rejected")) {
    for (const item of result) {
      if (item.status === "rejected") console.error("Admin attendance page data load failed", item.reason instanceof Error ? item.reason.message : String(item.reason));
    }
    return <AdminPanel title="Obecność"><p className="admin-notice" role="alert">Nie udało się wczytać obecności.</p></AdminPanel>;
  }
  const attendanceResult = result[0];
  const groupsResult = result[1];
  if (attendanceResult.status !== "fulfilled" || groupsResult.status !== "fulfilled") return <AdminPanel title="Obecność"><p className="admin-notice" role="alert">Nie udało się wczytać obecności.</p></AdminPanel>;
  const { activities, recipients } = attendanceResult.value;
  const groups = groupsResult.value;
  return <AdminPanel title="Obecność">
    <section className="admin-submissions-intro"><p>Wybierz czas zajęć i zaznacz osoby obecne, aby zapisać obecność.</p></section>
    <AttendanceManager
      activities={activities.map((activity) => ({
        activityDate: activity.activityDate.toISOString(),
        endsAt: activity.endsAt?.toISOString() || null,
        id: activity.id,
        name: activity.name,
        participants: activity.participants.map((participant) => ({ present: participant.present, submissionId: participant.submissionId })),
        startsAt: activity.startsAt.toISOString(),
      }))}
      groups={groups.map((group) => ({ id: group.id, name: group.name, submissionIds: group.memberships.map((membership) => membership.submissionId) }))}
      recipients={recipients}
    />
  </AdminPanel>;
}
