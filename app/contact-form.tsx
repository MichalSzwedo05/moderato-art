"use client";

import { useId, useState, type FormEvent } from "react";
import { contactOffers, type ContactLessonType } from "../lib/offers";

type ContactFormProps = {
  enabled?: boolean;
  lessonTitle: string;
  lessonType: ContactLessonType;
} | {
  enabled?: boolean;
  standalone: true;
};

export function ContactForm(props: ContactFormProps) {
  const { enabled = false } = props;
  const isStandalone = "standalone" in props;
  const statusId = useId();
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentName: formData.get("parentName"),
          email: formData.get("email"),
          phone: formData.get("phone") || undefined,
          lessonType: formData.get("lessonType") || undefined,
          childAgeRange: formData.get("childAgeRange") || undefined,
          message: formData.get("message"),
          website: formData.get("website") || undefined,
          privacyNoticeAcknowledged: formData.get("privacyNoticeAcknowledged") === "true",
        }),
      });
      const body = await response.json() as { message?: string };

      if (!response.ok) {
        setStatus(body.message || "Nie udało się przesłać zgłoszenia.");
        return;
      }

      form.reset();
      setStatus(body.message || "Zgłoszenie zostało przyjęte.");
    } catch {
      setStatus("Nie udało się przesłać zgłoszenia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" aria-describedby={statusId} onSubmit={enabled ? submitForm : undefined}>
      <fieldset disabled={!enabled}>
        <legend>Formularz kontaktowy</legend>
        <label>
          Imię i nazwisko osoby kontaktowej
          <input autoComplete="name" name="parentName" placeholder="Np. Anna Kowalska" required type="text" />
        </label>
        <label>
          Adres e-mail
          <input autoComplete="email" name="email" placeholder="twoj@email.pl" required type="email" />
        </label>
        <label>
          Numer telefonu
          <input autoComplete="tel" name="phone" placeholder="Np. 500 000 000" type="tel" />
        </label>
        {isStandalone ? (
          <label>
            Rodzaj zajęć
            <select defaultValue="" name="lessonType" required>
              <option disabled value="">Wybierz rodzaj zajęć</option>
              {contactOffers.map((offer) => <option key={offer.lessonType} value={offer.lessonType}>{offer.title}</option>)}
            </select>
          </label>
        ) : (
          <>
            <div className="contact-form-offer">
              <span className="contact-form-offer-label">Wybrane zajęcia</span>
              <strong className="contact-form-offer-value">{props.lessonTitle}</strong>
            </div>
            <input name="lessonType" type="hidden" value={props.lessonType} />
          </>
        )}
        <label>
          Wiek uczestnika
          <select defaultValue="" name="childAgeRange">
            <option disabled value="">Wybierz przedział wieku</option>
            <option value="3-5">3–5 lat</option>
            <option value="6-9">6–9 lat</option>
            <option value="10-15">10–15 lat</option>
            <option value="16-plus">16 lat lub więcej</option>
          </select>
        </label>
        <label>
          Wiadomość
          <textarea name="message" placeholder="Napisz, jakich zajęć szukasz. Nie podawaj danych wrażliwych w wiadomości." required rows={4} />
        </label>
        <label aria-hidden="true" className="contact-form-honeypot">
          Strona internetowa
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
        <label className="contact-form-consent">
          <input name="privacyNoticeAcknowledged" required type="checkbox" value="true" />
          <span>Potwierdzam zapoznanie się z <a href="/polityka-prywatnosci" rel="noreferrer" target="_blank">polityką prywatności</a>. Nie jest to zgoda na marketing.</span>
        </label>
        <button className="button button-primary" disabled={isSubmitting} type="submit">
          {enabled ? (isSubmitting ? "Przesyłanie..." : "Wyślij zgłoszenie") : "Formularz chwilowo niedostępny"}
        </button>
      </fieldset>
      <small aria-live="polite" id={statusId}>
        {status || (enabled
           ? "Zgłoszenie zostanie zapisane w bezpiecznej bazie. Nie podawaj danych wrażliwych w wiadomości."
          : "Formularz zostanie aktywowany po zatwierdzeniu zasad przetwarzania danych i infrastruktury.")}
      </small>
    </form>
  );
}
