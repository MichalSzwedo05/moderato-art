"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/admin/gallery", label: "Galeria" },
  { href: "/admin/articles", label: "Artykuły" },
  { href: "/admin/password", label: "Hasło" },
  { href: "/admin/sms", label: "SMS" },
  { href: "/admin/email", label: "E-mail" },
  { href: "/admin/groups", label: "Grupy" },
  { href: "/admin/attendance", label: "Obecność" },
  { href: "/admin/calendar", label: "Kalendarz" },
  { href: "/admin/submissions", label: "Zgłoszenia" },
  { external: true, href: "https://docs.google.com/spreadsheets/d/1tek0IUfI64-xh0WTHq_fDGfskz91eNcg6lxGlduG25M/edit?usp=drive_web&ouid=106431518942586011282", label: "Zapisy Excel" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  function navigate(value: string) {
    if (!value) return;
    if (value.startsWith("external:")) {
      window.open(value.slice("external:".length), "_blank", "noopener,noreferrer");
      return;
    }
    router.push(value);
  }

  return (
    <nav aria-label="Nawigacja panelu administracyjnego" className="admin-nav">
      <div className="admin-nav-links">
        {items.map((item) => (
          item.external ? (
            <a className="admin-nav-link" href={item.href} key={item.href} rel="noreferrer" target="_blank">{item.label}</a>
          ) : (
            <Link className={pathname === item.href ? "admin-nav-link admin-nav-link-active" : "admin-nav-link"} href={item.href} key={item.href}>{item.label}</Link>
          )
        ))}
      </div>
      <label className="admin-nav-mobile-label" htmlFor="admin-nav-mobile">Przejdź do</label>
      <select aria-label="Nawigacja panelu administracyjnego" className="admin-nav-mobile" id="admin-nav-mobile" onChange={(event) => navigate(event.target.value)} value={pathname}>
        {items.map((item) => <option key={item.href} value={item.external ? `external:${item.href}` : item.href}>{item.label}</option>)}
      </select>
    </nav>
  );
}
