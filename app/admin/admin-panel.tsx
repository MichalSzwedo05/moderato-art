import type { ReactNode } from "react";
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
          </div>
        </header>
        <AdminNav />
        {children}
      </section>
    </main>
  );
}
