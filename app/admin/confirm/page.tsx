import type { Metadata } from "next";
import Link from "next/link";
import { isAdminCmsEnabled } from "@/lib/admin-auth";
import { isMagicToken } from "@/lib/admin-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Potwierdź logowanie",
};

export default async function ConfirmAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const validToken = typeof token === "string" && isMagicToken(token);

  return (
    <main className="admin-shell">
      <section className="admin-card admin-login-card">
        <Link className="admin-secondary-button admin-header-home-link" href="/">Strona główna</Link>
        <p className="admin-eyebrow">Moderato Art</p>
        <h1>Potwierdź logowanie</h1>
        {!isAdminCmsEnabled() || !validToken ? (
          <p>Nie można teraz potwierdzić logowania.</p>
        ) : (
          <form action="/admin/auth/confirm" className="admin-form" method="post">
            <input name="token" type="hidden" value={token} />
            <p>Potwierdź, aby otworzyć panel administracyjny.</p>
            <button type="submit">Potwierdź logowanie</button>
          </form>
        )}
        <Link className="admin-secondary-button admin-public-link" href="/">Strona główna</Link>
      </section>
    </main>
  );
}
