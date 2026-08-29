"use client";

import { useId, useState, type FormEvent } from "react";
import { contactOffers, type ContactLessonType } from "../lib/offers";

function RequiredMark() {
  return <span aria-hidden="true" className="contact-form-required">{"\u00A0*"}</span>;
}


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
  const [selectedLessonType, setSelectedLessonType] = useState<ContactLessonType | "">("");
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
          childName: formData.get("childName") || undefined,
          birthDate: formData.get("birthDate"),
          preschool: formData.get("preschool"),
          group: formData.get("group"),
          address: formData.get("address") || undefined,
          email: formData.get("email"),
          phone: formData.get("phone") || undefined,
          lessonType: formData.get("lessonType") || undefined,
          paymentAccepted: formData.get("paymentAccepted") === "true",
          imageConsent: formData.get("imageConsent"),
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
      if (isStandalone) setSelectedLessonType("");
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
        <p className="contact-form-required-note">Pola oznaczone <RequiredMark /> są wymagane.</p>
        <label>
          Imię i nazwisko dziecka
          <input autoComplete="name" name="childName" placeholder="Np. Anna Kowalska" type="text" />
        </label>
        <label>
          <span>Data urodzenia dziecka<RequiredMark /></span>
          <input name="birthDate" required type="date" />
        </label>
        <label>
          <span>Przedszkole, do którego uczęszcza dziecko<RequiredMark /></span>
          <input name="preschool" required type="text" />
        </label>
        <label>
          <span>Grupa<RequiredMark /></span>
          <input name="group" required type="text" />
        </label>
        <label>
          Dane kontaktowe (adres: ulica, kod pocztowy)
          <input autoComplete="street-address" name="address" type="text" />
        </label>
        <label>
          <span>Adres e-mail<RequiredMark /></span>
          <input autoComplete="email" name="email" placeholder="twoj@email.pl" required type="email" />
        </label>
        <label>
          Numer telefonu
          <input autoComplete="tel" name="phone" placeholder="Np. 500 000 000" type="tel" />
        </label>
        {isStandalone ? (
          <label>
            <span>Rodzaj zajęć<RequiredMark /></span>
            <select name="lessonType" onChange={(event) => setSelectedLessonType(event.currentTarget.value as ContactLessonType)} required value={selectedLessonType}>
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
        <fieldset>
          <legend>Zobowiązuję się do terminowej zapłaty za zajęcia, tj. 100 zł miesięcznie do 10. dnia każdego miesiąca.<RequiredMark /></legend>
          <label className="contact-form-consent">
            <input name="paymentAccepted" required type="checkbox" value="true" />
            <span>Akceptuję warunki</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Oświadczam, że wyrażam zgodę na rejestrowanie i wykorzystanie wizerunku mojego dziecka w celach informacyjnych i promocyjnych.<RequiredMark /></legend>
          <label className="contact-form-consent">
            <input name="imageConsent" required type="radio" value="Wyrażam zgodę" />
            <span>Wyrażam zgodę</span>
          </label>
          <label className="contact-form-consent">
            <input name="imageConsent" required type="radio" value="Nie wyrażam zgody" />
            <span>Nie wyrażam zgody</span>
          </label>
        </fieldset>
        <label aria-hidden="true" className="contact-form-honeypot">
          Strona internetowa
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
        <label className="contact-form-consent">
          <input name="privacyNoticeAcknowledged" required type="checkbox" value="true" />
          <span>Potwierdzam zapoznanie się z <a href="/polityka-prywatnosci" rel="noreferrer" target="_blank">polityką prywatności</a>. Nie jest to zgoda na marketing.<RequiredMark /></span>
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
