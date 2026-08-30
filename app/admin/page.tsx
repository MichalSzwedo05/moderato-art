import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Panel administracyjny",
};

type AdminPageProps = {
  searchParams: Promise<{ login?: string }>;
};

function LoginForm({ mode, notice }: { mode: "magic_link" | "password"; notice?: string }) {
  return (
    <main className="admin-shell">
      <section className="admin-card admin-login-card">
        <Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link>
        <p className="admin-eyebrow">Moderato Art</p>
        <h1>Panel administracyjny</h1>
        <p>{mode === "password" ? "Podaj nazwę użytkownika i hasło administratora." : "Podaj adres e-mail administratora. Jeśli dostęp jest możliwy, otrzymasz link do logowania."}</p>
        {mode === "magic_link" && notice === "sent" ? <p className="admin-success" role="status">Jeśli adres ma dostęp, link do logowania został wysłany.</p> : null}
        {notice && notice !== "sent" ? <p className="admin-notice" role="status">Nie można teraz zalogować się. Spróbuj ponownie.</p> : null}
        <form action={mode === "password" ? "/admin/auth/password" : "/admin/auth/request"} method="post" className="admin-form">
          {mode === "password" ? <><label htmlFor="admin-username">Nazwa użytkownika</label><input autoComplete="username" id="admin-username" maxLength={100} name="username" required /><label htmlFor="admin-password">Hasło</label><input autoComplete="current-password" id="admin-password" maxLength={1024} name="password" required type="password" /></> : <><label htmlFor="admin-email">Adres e-mail</label><input autoComplete="email" id="admin-email" name="email" required type="email" /></>}
          <button type="submit">{mode === "password" ? "Zaloguj" : "Wyślij link"}</button>
        </form>
      </section>
    </main>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const config = getAdminAuthConfig();
  if (!config) {
    return (
      <main className="admin-shell">
        <section className="admin-card"><Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link><p>Panel administracyjny jest chwilowo niedostępny.</p></section>
      </main>
    );
  }

  const session = await getAdminSession();
  if (!session) {
    return <LoginForm mode={config.mode} notice={params.login} />;
  }

  redirect("/admin/gallery");
}
