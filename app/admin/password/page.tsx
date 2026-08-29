import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "../change-password-form";
import { AdminPanel } from "../admin-panel";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Hasło · Panel administracyjny",
};

type PasswordPageProps = {
  searchParams: Promise<{ password?: string }>;
};

export default async function AdminPasswordPage({ searchParams }: PasswordPageProps) {
  const params = await searchParams;
  const config = getAdminAuthConfig();
  if (!config) {
    return <main className="admin-shell"><section className="admin-card"><p>Panel administracyjny jest chwilowo niedostępny.</p><Link className="admin-secondary-button admin-public-link" href="/">Strona główna</Link></section></main>;
  }
  if (!(await getAdminSession())) {
    redirect("/admin");
  }

  return <AdminPanel title="Zmiana hasła">
    {params.password === "changed" ? <p className="admin-success" role="status">Hasło administratora zostało zmienione.</p> : null}
    {config.mode === "password" ? <ChangePasswordForm /> : <p className="admin-notice" role="status">Zmiana hasła nie jest dostępna w tym trybie logowania.</p>}
  </AdminPanel>;
}
