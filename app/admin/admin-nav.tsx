"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/gallery", label: "Galeria" },
  { href: "/admin/articles", label: "Artykuły" },
  { href: "/admin/password", label: "Hasło" },
  { href: "/admin/submissions", label: "Zgłoszenia" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Nawigacja panelu administracyjnego" className="admin-nav">
      {items.map((item) => (
        <Link className={pathname === item.href ? "admin-nav-link admin-nav-link-active" : "admin-nav-link"} href={item.href} key={item.href}>{item.label}</Link>
      ))}
    </nav>
  );
}
