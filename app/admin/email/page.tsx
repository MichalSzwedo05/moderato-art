import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { getContactSubmissionEmailRecipients } from "@/lib/contact-submissions";
import { getContactGroups } from "@/lib/contact-groups";
import { AdminPanel } from "../admin-panel";
import { EmailForm } from "./email-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "E-mail · Panel administracyjny",
};

export default async function EmailPage() {
  const config = getAdminAuthConfig();
  if (!config) {
    return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  }
  if (!(await getAdminSession())) redirect("/admin");

  const [recipients, groups] = await Promise.all([
    getContactSubmissionEmailRecipients(),
    getContactGroups(),
  ]);
  const recipientIds = new Set(recipients?.map((recipient) => recipient.id));
  const groupRecipients = groups?.map((group) => ({
    id: group.id,
    name: group.name,
    submissionIds: group.memberships.map((membership) => membership.submissionId).filter((id) => recipientIds.has(id)),
  })) ?? [];

  return <AdminPanel title="E-mail">
    <section className="admin-sms-intro">
      <p>Wyślij wiadomość e-mail do wybranych osób zapisanych w bazie zgłoszeń.</p>
    </section>
    {recipients === undefined
      ? <p className="admin-notice" role="alert">Nie udało się wczytać odbiorców e-mail.</p>
      : <EmailForm groups={groupRecipients} recipients={recipients} />}
  </AdminPanel>;
}
