"use client";

import { FormEvent, useId, useState } from "react";

type ContactFormProps = {
  testEnabled?: boolean;
};

export function ContactForm({ testEnabled = false }: ContactFormProps) {
  const statusId = useId();
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitTestForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const testToken = String(formData.get("testToken") || "");

    setIsSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Contact-Test-Token": testToken,
        },
        body: JSON.stringify({
          parentName: formData.get("parentName"),
          email: formData.get("email"),
          phone: formData.get("phone") || undefined,
          lessonType: formData.get("lessonType") || undefined,
          childAgeRange: formData.get("childAgeRange") || undefined,
          message: formData.get("message"),
          website: formData.get("website") || undefined,
        }),
      });
      const body = await response.json() as { message?: string };

      if (!response.ok) {
        setStatus(body.message || "Nie udało się wysłać wiadomości testowej.");
        return;
      }

      form.reset();
      setStatus(body.message || "Wiadomość testowa została wysłana.");
    } catch {
      setStatus("Nie udało się połączyć z usługą wysyłki wiadomości.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" aria-describedby={statusId} onSubmit={testEnabled ? submitTestForm : undefined}>
      <fieldset disabled={!testEnabled}>
        <legend>Formularz kontaktowy</legend>
        {testEnabled && (
          <>
            <p className="contact-form-test-notice">Tryb testowy: używaj wyłącznie fikcyjnych danych. Wiadomość nie jest zapisywana w bazie.</p>
            <label>
              Kod dostępu do testu
              <input autoComplete="off" name="testToken" required type="password" />
            </label>
          </>
        )}
        <label>
          Imię i nazwisko rodzica lub opiekuna
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
        <label>
          Rodzaj zajęć
          <select defaultValue="" name="lessonType">
            <option disabled value="">Wybierz zajęcia</option>
            <option value="rytmika">Rytmisolki</option>
            <option value="junior-voice">Junior Voice</option>
            <option value="studio-wokalne">Studio Wokalne</option>
          </select>
        </label>
        <label>
          Wiek dziecka
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
          <textarea name="message" placeholder="Napisz, jakich zajęć szukasz. Nie podawaj danych wrażliwych dziecka." required rows={4} />
        </label>
        <label aria-hidden="true" className="contact-form-honeypot">
          Strona internetowa
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>
        <button className="button button-primary" disabled={isSubmitting} type="submit">
          {testEnabled ? (isSubmitting ? "Wysyłanie..." : "Wyślij wiadomość testową") : "Formularz chwilowo niedostępny"}
        </button>
      </fieldset>
      <small aria-live="polite" id={statusId}>
        {status || (testEnabled
          ? "Test jest chroniony kodem dostępu i wysyła wiadomości wyłącznie na konto Resend właściciela."
          : "Formularz zostanie aktywowany po zatwierdzeniu zasad przetwarzania danych i infrastruktury.")}
      </small>
    </form>
  );
}
