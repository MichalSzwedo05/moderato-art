"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { formLessonOffers, type ContactLessonType } from "../lib/offers";

type SubmitPopup = { kind: "success" | "error"; message: string };

function RequiredMark() {
  return <span aria-hidden="true" className="contact-form-required">{"\u00A0*"}</span>;
}


type ContactFormProps = {
  enabled?: boolean;
  lessonTitle: string;
  lessonType: ContactLessonType;
} | {
  enabled?: boolean;
  initialLessonType?: ContactLessonType;
  standalone: true;
};

export function ContactForm(props: ContactFormProps) {
  const { enabled = false } = props;
  const isStandalone = "standalone" in props;
  const initialLessonType: ContactLessonType | undefined = isStandalone && "initialLessonType" in props ? props.initialLessonType : undefined;
  const [selectedLessonType, setSelectedLessonType] = useState<ContactLessonType>(
    "standalone" in props ? (props.initialLessonType ?? "junior-voice") : props.lessonType,
  );
  const statusId = useId();
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState<SubmitPopup | null>(null);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!popup) return;
    popupTimer.current = setTimeout(() => setPopup(null), 5000);
    return () => clearTimeout(popupTimer.current);
  }, [popup]);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setStatus("");

    try {
      const payload: Record<string, unknown> = {
        childName: formData.get("childName") || undefined,
        birthDate: formData.get("birthDate"),
        addressStreet: formData.get("addressStreet") || undefined,
        postalCode: formData.get("postalCode") || undefined,
        city: formData.get("city") || undefined,
        email: formData.get("email"),
        phone: formData.get("phone") || undefined,
        lessonType: formData.get("lessonType") || undefined,
        imageConsent: formData.get("imageConsent"),
        website: formData.get("website") || undefined,
        privacyNoticeAcknowledged: formData.get("privacyNoticeAcknowledged") === "true",
      };
      if (selectedLessonType === "junior-voice") {
        payload.preschool = formData.get("preschool");
        payload.group = formData.get("group");
        payload.paymentAccepted = formData.get("paymentAccepted") === "true";
      }
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { message?: string };

      if (!response.ok) {
        setStatus(body.message || "Nie udało się przesłać zgłoszenia.");
        setPopup({ kind: "error", message: body.message || "Nie udało się przesłać zgłoszenia. Spróbuj ponownie." });
        return;
      }

      form.reset();
      if (isStandalone) setSelectedLessonType(initialLessonType ?? "junior-voice");
      setStatus("");
      setPopup({ kind: "success", message: body.message || "Zgłoszenie zostało przyjęte." });
    } catch {
      setStatus("Nie udało się przesłać zgłoszenia.");
      setPopup({ kind: "error", message: "Nie udało się przesłać zgłoszenia. Spróbuj ponownie." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
    <form className="contact-form" aria-describedby={statusId} onSubmit={enabled ? submitForm : undefined}>
      <fieldset disabled={!enabled}>
        <legend>Formularz kontaktowy</legend>
        <p className="contact-form-required-note">Pola oznaczone <RequiredMark /> są wymagane.</p>
        {isStandalone ? (
          <label>
            <span>Rodzaj zajęć<RequiredMark /></span>
            <select name="lessonType" onChange={(event) => setSelectedLessonType(event.currentTarget.value as ContactLessonType)} required value={selectedLessonType}>
              {formLessonOffers.filter((offer) => offer.lessonType === "junior-voice").map((offer) => <option key={offer.lessonType} value={offer.lessonType}>{offer.title}</option>)}
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
          <span>{selectedLessonType === "junior-voice" ? "Imię i nazwisko dziecka" : "Imię i nazwisko"}<RequiredMark /></span>
          <input autoComplete="name" name="childName" placeholder="Np. Anna Kowalska" required type="text" />
        </label>
        <label>
          <span>{selectedLessonType === "junior-voice" ? "Data urodzenia dziecka" : "Data urodzenia"}<RequiredMark /></span>
          <input name="birthDate" required type="date" />
        </label>
        {selectedLessonType === "junior-voice" ? (
          <>
            <label>
              <span>Przedszkole, do którego uczęszcza dziecko<RequiredMark /></span>
              <input name="preschool" required type="text" />
            </label>
            <label>
              <span>Grupa<RequiredMark /></span>
              <input name="group" required type="text" />
            </label>
          </>
        ) : null}
        <label>
          <span>Adres e-mail<RequiredMark /></span>
          <input autoComplete="email" name="email" placeholder="twoj@email.pl" required type="email" />
        </label>
        <label>
          <span>Numer telefonu<RequiredMark /></span>
          <input autoComplete="tel" name="phone" pattern="[+0-9 ().,\/-]{7,25}" placeholder="Np. 500 000 000" required title="Podaj polski numer telefonu albo numer międzynarodowy zaczynający się od + lub 00." type="tel" />
        </label>
        <fieldset className="contact-form-address-fieldset">
          <legend>Dane kontaktowe</legend>
          <label>
            Ulica i numer
            <input autoComplete="street-address" name="addressStreet" placeholder="Np. Marszałkowska 15" type="text" />
          </label>
          <div className="contact-form-address-row">
            <label>
              Kod pocztowy
              <input autoComplete="postal-code" name="postalCode" placeholder="Np. 00-001" type="text" />
            </label>
            <label>
              Miasto
              <input autoComplete="address-level2" name="city" placeholder="Np. Warszawa" type="text" />
            </label>
          </div>
        </fieldset>
        {selectedLessonType === "junior-voice" ? (
          <fieldset>
            <legend>Zobowiązuję się do terminowej zapłaty za zajęcia, tj. 100 PLN miesięcznie do 10. dnia każdego miesiąca.<br />Dane do przelewu: Moderato, ul. Krokusowa 25, 86-012 Żołędowo<br />16 10501429 1000 0097 6911 7905.<RequiredMark /></legend>
            <label className="contact-form-consent">
              <input name="paymentAccepted" required type="radio" value="true" />
              <span>Akceptuję warunki</span>
            </label>
          </fieldset>
        ) : null}
        <fieldset>
          <legend>Oświadczam, że wyrażam zgodę na rejestrowanie i wykorzystanie wizerunku {selectedLessonType === "junior-voice" ? "mojego dziecka" : "uczestnika"} w celach informacyjnych i promocyjnych.<RequiredMark /></legend>
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
    {popup ? (
      <div className="contact-form-popup" data-kind={popup.kind} role={popup.kind === "success" ? "status" : "alert"}>
        <span aria-hidden="true" className="contact-form-popup-icon">{popup.kind === "success" ? "✓" : "!"}</span>
        <p>{popup.message}</p>
        <button aria-label="Zamknij powiadomienie" onClick={() => setPopup(null)} type="button">×</button>
      </div>
    ) : null}
    </>
  );
}
