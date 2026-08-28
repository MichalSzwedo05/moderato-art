import Link from "next/link";

export default function NotFound() {
  return <main className="error-page">
    <h1>Nie znaleziono strony.</h1>
    <p>Sprawdź adres albo przejdź do kontaktu.</p>
    <Link className="button button-primary" href="/kontakt">Przejdź do kontaktu</Link>
    <Link className="text-link" href="/">Wróć na stronę główną</Link>
  </main>;
}
