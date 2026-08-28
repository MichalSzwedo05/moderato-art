"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  const pathname = usePathname();
  const isContactPage = pathname === "/kontakt" || pathname === "/kontakt/";
  const isAdminPage = pathname === "/admin" || pathname?.startsWith("/admin/") === true;

  return (
    <main className="error-page">
      <h1>Wystąpił nieoczekiwany błąd.</h1>
      <p>Spróbuj odświeżyć stronę lub skontaktuj się z nami później.</p>
      <button type="button" onClick={reset}>
        Spróbuj ponownie
      </button>
      {isContactPage || isAdminPage
        ? <Link className="button button-primary" href="/">Wróć na stronę główną</Link>
        : <Link className="button button-primary" href="/kontakt">Skontaktuj się z nami</Link>}
    </main>
  );
}
