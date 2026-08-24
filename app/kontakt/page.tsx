import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { isContactFormConfigured } from "../../lib/contact-config";
import { ContactForm } from "../contact-form";

export const metadata: Metadata = {
  description: "Skontaktuj się w sprawie zajęć muzycznych i lekcji śpiewu w Moderato Art.",
  title: "Kontakt",
};

export default async function ContactPage() {
  await connection();
  const contactFormEnabled = isContactFormConfigured();

  return (
    <main className="contact-page">
      <div className="site-shell contact-page-shell">
        <Link className="text-link contact-page-back" href="/">← Wróć na stronę główną</Link>
        <div className="contact-page-grid">
          <header className="contact-page-intro">
            <p className="eyebrow">Porozmawiajmy</p>
            <h1>Znajdźmy zajęcia dla Ciebie lub Twojego dziecka.</h1>
            <p>Wypełnij formularz, a wrócimy do Ciebie z informacjami o wybranych zajęciach.</p>
            <p className="contact-page-note">Nie podawaj w formularzu danych wrażliwych uczestnika.</p>
          </header>
          <ContactForm enabled={contactFormEnabled} standalone />
        </div>
      </div>
    </main>
  );
}
