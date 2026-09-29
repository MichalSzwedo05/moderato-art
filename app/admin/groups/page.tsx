import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { getContactGroupRecipients, getContactGroups } from "@/lib/contact-groups";
import { AdminPanel } from "../admin-panel";
import { GroupsManager } from "./groups-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Grupy · Panel administracyjny",
};

export default async function GroupsPage() {
  const config = getAdminAuthConfig();
  if (!config) {
    return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  }
  if (!(await getAdminSession())) redirect("/admin");

  const result = await Promise.allSettled([getContactGroups(), getContactGroupRecipients()]);
  if (result.some((item) => item.status === "rejected")) {
    for (const item of result) {
      if (item.status === "rejected") console.error("Admin groups page data load failed", item.reason instanceof Error ? item.reason.message : String(item.reason));
    }
    return <AdminPanel title="Grupy"><p className="admin-notice" role="alert">Nie udało się wczytać grup.</p></AdminPanel>;
  }

  const [groupsResult, recipientsResult] = result;
  const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
  const recipients = recipientsResult.status === "fulfilled" ? recipientsResult.value : [];
  return <AdminPanel title="Grupy">
    <section className="admin-submissions-intro">
      <p>Twórz własne grupy i przypisuj do nich kontakty. Jedna osoba może należeć do wielu grup.</p>
    </section>
    <GroupsManager groups={groups.map((group) => ({
      id: group.id,
      memberships: group.memberships.map((membership) => ({ submissionId: membership.submissionId })),
      name: group.name,
    }))} recipients={recipients} />
  </AdminPanel>;
}
