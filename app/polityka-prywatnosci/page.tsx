import type { Metadata } from "next";
import Link from "next/link";
import { privacyPolicy } from "../../lib/privacy-policy";

export const metadata: Metadata = {
  description: "Robocza polityka prywatności i zasady przetwarzania danych w serwisie Moderato Art.",
  robots: { follow: false, index: false },
  title: "Polityka prywatności i zasady przetwarzania danych",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <div className="site-shell legal-shell">
        <Link className="text-link legal-back-link" href="/">← Wróć na stronę główną</Link>
        <div className="legal-actions"><Link className="button button-primary" href="/kontakt">Przejdź do kontaktu</Link></div>
        <article className="legal-content">
          <p className="eyebrow">Dokument roboczy</p>
          <h1>Polityka prywatności i zasady przetwarzania danych</h1>
          <div className="legal-draft-warning" role="note">
            To jest wersja robocza. Dane administratora i kontaktu zostaną uzupełnione przed komercyjnym uruchomieniem serwisu.
          </div>
          <p className="legal-meta">Wersja: {privacyPolicy.version} · aktualizacja: {privacyPolicy.updatedAt}</p>

          <section>
            <h2>1. Administrator danych</h2>
            <p>Administratorem danych osobowych jest:</p>
            <dl className="legal-details">
              <div><dt>Administrator</dt><dd>{privacyPolicy.controller}</dd></div>
              <div><dt>Adres</dt><dd>{privacyPolicy.address}</dd></div>
              <div><dt>Kontakt w sprawach prywatności</dt><dd>{privacyPolicy.privacyContact}</dd></div>
            </dl>
          </section>

          <section>
            <h2>2. Jakie dane możemy otrzymać</h2>
            <p>Formularz kontaktowy może przekazać imię i nazwisko osoby kontaktowej, adres e-mail, opcjonalny numer telefonu, wybraną ofertę, przedział wieku uczestnika oraz opcjonalną treść wiadomości.</p>
            <p>Nie wpisuj do formularza diagnoz, informacji o zdrowiu ani innych danych wrażliwych uczestnika. Podaj tylko informacje potrzebne do odpowiedzi na zapytanie.</p>
          </section>

          <section>
            <h2>3. Cele i zasady przetwarzania</h2>
            <p>Dane są przetwarzane w celu odpowiedzi na zapytanie, ustalenia szczegółów zajęć i obsługi kontaktu. Proponowaną podstawą jest podjęcie działań na żądanie osoby przed zawarciem umowy oraz prawnie uzasadniony interes administratora polegający na obsłudze korespondencji. Ostateczna treść i podstawa prawna wymagają zatwierdzenia.</p>
            <p>Formularz nie służy do zapisywania na newsletter, marketingu bezpośredniego, profilowania ani zautomatyzowanego podejmowania decyzji.</p>
          </section>

          <section>
            <h2>4. Zgoda na zapoznanie się z informacją</h2>
            <p>Wysłanie formularza wymaga potwierdzenia zapoznania się z tą informacją. Potwierdzenie nie jest zgodą na marketing. Serwis zapisuje wersję informacji i czas potwierdzenia razem ze zgłoszeniem.</p>
          </section>

          <section>
            <h2>5. Odbiorcy i dostawcy usług</h2>
            <p>W ramach wersji roboczej serwis działa na infrastrukturze Vercel i Neon. W bieżącym trybie zgłoszenie jest zapisywane w Neon i dostępne dla upoważnionego administratora przez panel CMS. Powiadomienia e-mail przez Resend są opcjonalne i nie są wymagane do zapisania zgłoszenia.</p>
            <p>Zakres usług, regiony przetwarzania, umowy powierzenia i mechanizmy transferu danych wymagają potwierdzenia przed uruchomieniem komercyjnym.</p>
          </section>

          <section>
            <h2>6. Retencja</h2>
            <p>Proponowany okres przechowywania zgłoszenia w bazie wynosi {privacyPolicy.retentionMonths} miesięcy od jego otrzymania. Po tym czasie zgłoszenie powinno zostać usunięte automatycznie, chyba że odrębna podstawa prawna uzasadnia dalsze przechowywanie w innym systemie.</p>
            <p>Wygasłe linki logowania, sesje administracyjne i rekordy techniczne limitów powinny być usuwane w ramach cyklicznego zadania porządkowego. Kopie zapasowe i logi dostawców podlegają ich faktycznym okresom retencji, które wymagają potwierdzenia.</p>
          </section>

          <section>
            <h2>7. Cookies i dane techniczne</h2>
            <p>Publiczna część serwisu nie używa kodu analitycznego, reklamowych pikseli ani zapisywania preferencji w localStorage. Panel administracyjny używa niezbędnego, nieprzezroczystego dla użytkownika cookie sesyjnego z atrybutami Secure, HttpOnly i SameSite do utrzymania logowania. Przy formularzu serwer może przez krótki czas przetwarzać HMAC-owy identyfikator techniczny do ograniczania powtarzających się prób, bez zapisywania surowego adresu IP. Serwer może też przetwarzać podstawowe dane techniczne w logach bezpieczeństwa dostawcy hostingu.</p>
          </section>

          <section>
            <h2>8. Prawa osoby</h2>
            <p>Osobie, której dane dotyczą, przysługuje — w zakresie wynikającym z przepisów — prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz wniesienia sprzeciwu. Można również złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych.</p>
            <p>Żądania należy kierować na adres kontaktowy wskazany po uzupełnieniu danych administratora. Tożsamość osoby składającej żądanie może wymagać weryfikacji.</p>
          </section>

          <section>
            <h2>9. Zmiany dokumentu</h2>
            <p>Dokument będzie aktualizowany wraz ze zmianą sposobu działania serwisu, dostawców lub podstaw przetwarzania. Przy każdej zmianie zostanie podana nowa wersja i data aktualizacji.</p>
          </section>
        </article>
      </div>
    </main>
  );
}
