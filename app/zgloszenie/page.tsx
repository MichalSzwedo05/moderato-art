import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { isContactFormConfigured } from "../../lib/contact-config";
import { formLessonTypes, type ContactLessonType } from "../../lib/offers";
import { ContactForm } from "../contact-form";

export const metadata: Metadata = {
  description: "Zapisz dziecko lub siebie na zajęcia wokalne i muzyczne w Moderato Art — Rytmisolki, Junior Voice, Studio Wokalne i rehabilitacja zaburzeń głosu.",
  title: "Zgłoszenie na zajęcia",
};

type ZgloszeniePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ZgloszeniePage({ searchParams }: ZgloszeniePageProps) {
  await connection();
  const contactFormEnabled = isContactFormConfigured();
  const params = await searchParams;
  const zajecia = typeof params.zajecia === "string" ? params.zajecia : "";
  const initialLessonType = formLessonTypes.includes(zajecia as ContactLessonType) ? (zajecia as ContactLessonType) : undefined;

  return (
    <main className="contact-page">
      <div className="site-shell contact-page-shell">
        <Link className="text-link contact-page-back" href="/">← Wróć na stronę główną</Link>
        <div className="contact-page-single">
          <header className="contact-page-intro">
            <p className="eyebrow">Zgłoszenie na zajęcia</p>
            <h1>Zapisz się na zajęcia w Moderato Art.</h1>
            <p>Wybierz rodzaj zajęć i wypełnij formularz zgłoszeniowy. Wrócimy do Ciebie z potwierdzeniem i szczegółami.</p>
            <p className="contact-page-note">Nie podawaj w formularzu danych wrażliwych uczestnika.</p>
          </header>
          <ContactForm enabled={contactFormEnabled} initialLessonType={initialLessonType} standalone />
        </div>
      </div>
    </main>
  );
}
