import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ContactDetails } from "../contact-details";

export const metadata: Metadata = {
  description: "Skontaktuj się bezpośrednio lub przez formularz w sprawie zajęć muzycznych, lekcji śpiewu i pracy z głosem w Moderato Art.",
  title: "Kontakt",
};

export default async function ContactPage() {
  await connection();

  return (
    <main className="contact-page">
      <div className="site-shell contact-page-shell">
        <Link className="text-link contact-page-back" href="/">← Wróć na stronę główną</Link>
        <div className="contact-page-single">
          <div className="contact-page-intro">
            <header>
              <p className="eyebrow">Porozmawiajmy</p>
              <h1>Znajdźmy zajęcia dla Ciebie lub Twojego dziecka.</h1>
              <p>Skontaktuj się bezpośrednio albo wypełnij formularz zgłoszeniowy — wrócimy do Ciebie z informacjami o wybranych zajęciach.</p>
              <p className="contact-page-note">Nie podawaj w formularzu danych wrażliwych uczestnika.</p>
            </header>
          </div>
          <ContactDetails detailed />
          <div className="contact-page-enroll">
            <h2>Chcesz zapisać dziecko na zajęcia?</h2>
            <p>Wybierz rodzaj zajęć i wypełnij formularz zgłoszeniowy. Nie podawaj w nim danych wrażliwych uczestnika.</p>
            <Link className="offer-modal-enrollment-link" href="/zgloszenie">Przejdź do formularza zgłoszeniowego →</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
