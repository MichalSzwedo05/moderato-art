import type { ReactNode } from "react";
import Link from "next/link";
import { DownloadUserGuideButton } from "./download-user-guide-button";
import { AdminNav } from "./admin-nav";

export function AdminPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="admin-shell">
      <section className="admin-card admin-content-card">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Moderato Art</p>
            <h1>{title}</h1>
          </div>
          <div className="admin-header-actions">
            <DownloadUserGuideButton />
            <Link className="admin-secondary-button" href="/">Strona główna</Link>
            <form action="/admin/auth/logout" method="post"><button className="admin-secondary-button" type="submit">Wyloguj</button></form>
          </div>
        </header>
        <AdminNav />
        {children}
      </section>
    </main>
  );
}
