"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const body = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      body.append(key, String(value));
    }

    const response = await fetch("/admin/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (response.redirected) {
      window.location.assign(response.url);
      return;
    }

    if (response.status === 401) {
      window.location.href = "/admin";
      return;
    }

    const text = await response.text();
    if (response.status === 400) {
      setError("Nowe hasło musi mieć co najmniej 12 znaków, a oba pola muszą się zgadzać.");
    } else if (response.status === 403) {
      setError("Obecne hasło jest niepoprawne.");
    } else {
      setError(text || "Nie udało się zmienić hasła.");
    }
  }

  return (
    <section className="admin-gallery-section" aria-labelledby="change-password-heading">
      <h2 id="change-password-heading">Zmiana hasła</h2>
      <p>Wpisz obecne hasło oraz nowe hasło administratora.</p>
      {message ? <p className="admin-success" role="status">{message}</p> : null}
      {error ? <p className="admin-notice" role="alert">{error}</p> : null}
      <form onSubmit={handleSubmit} className="admin-form">
        <label htmlFor="current-password">Obecne hasło</label>
        <input autoComplete="current-password" id="current-password" maxLength={1024} name="currentPassword" required type="password" />
        <label htmlFor="new-password">Nowe hasło</label>
        <input autoComplete="new-password" id="new-password" maxLength={1024} minLength={12} name="newPassword" required type="password" />
        <label htmlFor="confirm-password">Powtórz nowe hasło</label>
        <input autoComplete="new-password" id="confirm-password" maxLength={1024} minLength={12} name="confirmPassword" required type="password" />
        <button type="submit">Zmień hasło</button>
      </form>
    </section>
  );
}
