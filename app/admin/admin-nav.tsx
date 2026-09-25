"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  return (
    <nav aria-label="Nawigacja panelu administracyjnego" className="admin-nav">
      {items.map((item) => (
        item.external ? (
          <a className="admin-nav-link" href={item.href} key={item.href} rel="noreferrer" target="_blank">{item.label}</a>
        ) : (
          <Link className={pathname === item.href ? "admin-nav-link admin-nav-link-active" : "admin-nav-link"} href={item.href} key={item.href}>{item.label}</Link>
        )
      ))}
    </nav>
  );
}
