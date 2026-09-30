import type { ReactNode } from "react";
import Link from "next/link";
import { DownloadUserGuideLink } from "./download-user-guide-link";
import { AdminNav } from "./admin-nav";

export function AdminPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="admin-shell">
      <section className="admin-card admin-content-card">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Moderato</p>
            <h1>{title}</h1>
          </div>
          <div className="admin-header-actions">
            <Link className="admin-secondary-button" href="/">Strona główna</Link>
            <form action="/admin/auth/logout" method="post"><button className="admin-secondary-button" type="submit">Wyloguj</button></form>
          </div>
        </header>
        <AdminNav />
        {children}
        <footer className="admin-panel-footer">
          <DownloadUserGuideLink />
        </footer>
      </section>
    </main>
  );
}
