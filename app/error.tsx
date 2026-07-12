"use client";

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main>
      <h1>Wystąpił nieoczekiwany błąd.</h1>
      <p>Spróbuj odświeżyć stronę lub skontaktuj się z nami później.</p>
      <button type="button" onClick={reset}>
        Spróbuj ponownie
      </button>
    </main>
  );
}
