import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { getContactSubmissionSmsRecipients } from "@/lib/contact-submissions";
import { normalizeSmsApiPhone } from "@/lib/smsapi";
import { AdminPanel } from "../admin-panel";
import { SmsForm } from "./sms-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "SMS · Panel administracyjny",
};

export default async function SmsPage() {
  const config = getAdminAuthConfig();
  if (!config) {
    return <main className="admin-shell"><section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section></main>;
  }
  if (!(await getAdminSession())) redirect("/admin");

  const recipients = (await getContactSubmissionSmsRecipients())
    ?.map((recipient) => ({ ...recipient, phone: normalizeSmsApiPhone(recipient.phone) }))
    .filter((recipient): recipient is typeof recipient & { phone: string } => Boolean(recipient.phone));

  return <AdminPanel title="SMS">
    <section className="admin-sms-intro">
      <p>Wyślij wiadomość SMS do wybranych osób zapisanych w bazie zgłoszeń.</p>
    </section>
    {recipients === undefined
      ? <p className="admin-notice" role="alert">Nie udało się wczytać odbiorców SMS.</p>
      : <SmsForm recipients={recipients} />}
  </AdminPanel>;
}
