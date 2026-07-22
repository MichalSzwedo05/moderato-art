import Image from "next/image";
import { CurrentYear } from "./current-year";
import { ThemeSwitcher } from "./theme-switcher";

const offers = [
  {
    number: "01",
    title: "Rytmisolki",
    subtitle: "Zajęcia muzyczno-rytmiczne",
    audience: "Dla dzieci w wieku przedszkolnym",
    description: "Śpiew, ruch i twórcza zabawa rozwijające słuch muzyczny, rytm i wyobraźnię.",
  },
  {
    number: "02",
    title: "Junior Voice",
    subtitle: "Grupowe lekcje śpiewu",
    audience: "Dla dzieci w wieku przedszkolnym",
    description: "Bezpieczne odkrywanie głosu, śpiew przy fortepianie i pierwsze doświadczenia sceniczne.",
  },
  {
    number: "03",
    title: "Studio Wokalne",
    subtitle: "Indywidualne lekcje śpiewu",
    audience: "Dla dzieci, młodzieży i dorosłych",
    description: "Świadoma praca nad oddechem, emisją głosu, dykcją i interpretacją utworów.",
  },
];

const benefits = [
  "Uwaga i tempo dopasowane do dziecka",
  "Nauka przez zabawę i swobodne odkrywanie",
  "Troska o zdrową, świadomą pracę z głosem",
  "Spokojna przestrzeń do budowania odwagi",
];

const articles = [
  {
    category: "Dla rodziców",
    title: "Jak muzyka wspiera codzienny rozwój dziecka?",
    date: "Wkrótce",
  },
  {
    category: "Wokół głosu",
    title: "Pierwsze kroki w nauce śpiewu - bez presji",
    date: "Wkrótce",
  },
  {
    category: "Inspiracje",
    title: "Rytm, ruch i radość wspólnego muzykowania",
    date: "Wkrótce",
  },
];

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Przejdź do treści
      </a>
      <header className="site-header">
        <div className="site-shell navigation">
          <a className="brand" href="#start" aria-label="Moderato Art - strona główna">
            <Image className="brand-logo" src="/moderato-logo.jpg" alt="Moderato" width={1563} height={600} priority />
            <span className="brand-tagline">Muzyczna Kraina Malucha</span>
          </a>
          <nav aria-label="Główna nawigacja">
            <a href="#o-mnie">O mnie</a>
            <a href="#oferta">Oferta</a>
            <a href="#blog">Artykuły</a>
            <a href="#kontakt">Kontakt</a>
          </nav>
          <ThemeSwitcher />
          <a className="header-action" href="#kontakt">
            Zapytaj o zajęcia
          </a>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" id="start" aria-labelledby="hero-title">
          <div className="site-shell hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Muzyka, głos, wrażliwość</p>
              <h1 id="hero-title">
                Daj dziecku <em>głos,</em> który lubi brzmieć.
              </h1>
              <p className="hero-intro">
                Zajęcia muzyczno-rytmiczne, grupowe lekcje śpiewu i indywidualna
                praca z głosem dla dzieci, młodzieży i dorosłych.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#kontakt">
                  Zapytaj o zajęcia
                </a>
                <a className="text-link" href="#oferta">
                  Poznaj ofertę <span aria-hidden="true">-&gt;</span>
                </a>
              </div>
              <p className="hero-note">Zajęcia grupowe dla przedszkolaków oraz indywidualne lekcje śpiewu</p>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="hero-sun" />
              <div className="hero-arch hero-arch-back" />
              <div className="hero-arch hero-arch-front" />
              <div className="note note-one">o</div>
              <div className="note note-two">o</div>
              <div className="note note-three">o</div>
              <Image className="identity-card" src="/moderato-identity-card.png" alt="" width={100} height={200} priority />
              <p>W muzyce jest miejsce na każdy głos.</p>
            </div>
          </div>
        </section>

        <section className="intro-section" id="o-mnie" aria-labelledby="about-title">
          <div className="site-shell intro-grid">
            <figure className="portrait">
              <Image
                src="/magdalena-warzecha-hiller.jpg"
                alt="Magdalena Warzecha-Hiller"
                fill
                priority
                sizes="(max-width: 900px) min(100vw - 3rem, 30rem), 31vw"
              />
              <figcaption>Magdalena Warzecha-Hiller</figcaption>
            </figure>
            <div className="intro-copy">
              <p className="eyebrow">Poznaj prowadzącą</p>
              <h2 id="about-title">Muzyka zaczyna się od uważnego słuchania.</h2>
              <p>
                Magdalena Warzecha-Hiller jest sopranistką, pedagogiem śpiewu i
                rehabilitantką zaburzeń głosu. W pracy z dziećmi łączy muzyczną
                wrażliwość z wiedzą o świadomej, bezpiecznej pracy z głosem.
              </p>
              <p>
                Każde spotkanie jest dopasowane do wieku, możliwości i tempa
                dziecka. Bez pośpiechu, za to z dużą dozą ciekawości, ruchu i
                wspólnego muzykowania.
              </p>
              <a className="text-link" href="#kontakt">
                Dowiedz się więcej <span aria-hidden="true">-&gt;</span>
              </a>
            </div>
          </div>
        </section>

        <section className="offer-section" id="oferta" aria-labelledby="offer-title">
          <div className="site-shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Co robimy</p>
                <h2 id="offer-title">Znajdź swój rytm i własny głos.</h2>
              </div>
              <p>
                Wybierz program dopasowany do wieku, potrzeb i muzycznych marzeń.
              </p>
            </div>
            <div className="offer-grid">
              {offers.map((offer) => (
                <article className="offer-card" key={offer.number}>
                  <span>{offer.number}</span>
                  <h3>{offer.title}</h3>
                  <p className="offer-subtitle">{offer.subtitle}</p>
                  <p className="offer-audience">{offer.audience}</p>
                  <p>{offer.description}</p>
                  <a href="#kontakt" aria-label={`Zapytaj o: ${offer.title}`}>
                    Więcej <span aria-hidden="true">-&gt;</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="benefits-section" aria-labelledby="benefits-title">
          <div className="site-shell benefits-grid">
            <div>
              <p className="eyebrow">Dobra atmosfera</p>
              <h2 id="benefits-title">Ważna jest nie tylko melodia.</h2>
              <p className="benefits-intro">
                Muzyka pomaga słuchać, wyrażać emocje i z większą swobodą być
                sobą. Dlatego dbamy o proces, nie o perfekcję.
              </p>
            </div>
            <ul>
              {benefits.map((benefit) => (
                <li key={benefit}>
                  <span aria-hidden="true">+</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="gallery-section" aria-labelledby="gallery-title">
          <div className="site-shell">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Przestrzeń do tworzenia</p>
                <h2 id="gallery-title">Miejsce, w którym muzyka się dzieje.</h2>
              </div>
              <p>Tu wkrótce pojawią się kolejne zdjęcia z zajęć i muzyczne inspiracje.</p>
            </div>
            <div className="gallery-grid" aria-label="Miejsce na galerię zdjęć">
              <div className="gallery-tile gallery-tile-tall"><span>01</span></div>
              <div className="gallery-tile gallery-tile-warm"><span>02</span></div>
              <div className="gallery-tile gallery-tile-blue"><span>03</span></div>
              <div className="gallery-tile gallery-tile-wide"><span>04</span></div>
            </div>
          </div>
        </section>

        <section className="blog-section" id="blog" aria-labelledby="blog-title">
          <div className="site-shell">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Czytelnia Moderato</p>
                <h2 id="blog-title">Kilka słów o muzyce i dzieciach.</h2>
              </div>
              <a className="text-link" href="#kontakt">
                Wszystkie artykuły <span aria-hidden="true">-&gt;</span>
              </a>
            </div>
            <div className="article-grid">
              {articles.map((article) => (
                <article className="article-card" key={article.title}>
                  <p>{article.category}</p>
                  <h3>{article.title}</h3>
                  <span>{article.date}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section" id="kontakt" aria-labelledby="contact-title">
          <div className="site-shell contact-grid">
            <div>
              <p className="eyebrow">Porozmawiajmy</p>
              <h2 id="contact-title">Znajdźmy zajęcia dla Ciebie lub Twojego dziecka.</h2>
              <p>
                Napisz kilka słów o tym, czego szukasz. Odpowiem i wspólnie
                ustalimy najlepszą formę pierwszego spotkania.
              </p>
              <p className="contact-placeholder">
                Dane kontaktowe zostaną uzupełnione przed publikacją strony.
              </p>
            </div>
            <form className="contact-form" action="#" method="post">
              <label>
                Imię i nazwisko rodzica lub opiekuna
                <input name="name" type="text" autoComplete="name" placeholder="Np. Anna Kowalska" disabled />
              </label>
              <label>
                Adres e-mail
                <input name="email" type="email" autoComplete="email" placeholder="twoj@email.pl" disabled />
              </label>
              <label>
                Wiadomość
                <textarea name="message" rows={4} placeholder="Napisz, ile lat ma dziecko i jakie zajęcia Cię interesują." disabled />
              </label>
              <button className="button button-primary" type="button" disabled>
                Formularz wkrótce
              </button>
              <small>Formularz zostanie aktywowany po konfiguracji danych kontaktowych.</small>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-shell footer-content">
          <a className="brand brand-footer" href="#start" aria-label="Moderato Art - powrót na początek">
            <span className="footer-brand-name">Moderato</span>
            <span className="brand-tagline">Muzyczna Kraina Malucha</span>
          </a>
          <p>Muzyka i śpiew dla dzieci.</p>
          <p>© <CurrentYear /> Moderato Art</p>
        </div>
      </footer>
    </>
  );
}
