const offers = [
  {
    number: "01",
    title: "Lekcje śpiewu",
    description: "Indywidualna praca z głosem, oddechem i pewnością siebie.",
  },
  {
    number: "02",
    title: "Zajęcia muzyczne",
    description: "Spotkania pełne dźwięków, ruchu i muzycznej wyobraźni.",
  },
  {
    number: "03",
    title: "Rytmika",
    description: "Rozwijanie poczucia rytmu przez zabawę i wspólne muzykowanie.",
  },
  {
    number: "04",
    title: "Muzyka dla przedszkolaków",
    description: "Łagodne pierwsze spotkania z muzyką dla najmłodszych dzieci.",
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
            <span className="brand-mark" aria-hidden="true">
              M
            </span>
            <span>
              <strong>Moderato</strong>
              <small>art</small>
            </span>
          </a>
          <nav aria-label="Główna nawigacja">
            <a href="#o-mnie">O mnie</a>
            <a href="#oferta">Oferta</a>
            <a href="#blog">Blog</a>
            <a href="#kontakt">Kontakt</a>
          </nav>
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
                Zajęcia muzyczne i nauka śpiewu dla dzieci prowadzone z uwagą,
                czułością i radością odkrywania.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#kontakt">
                  Zapytaj o zajęcia
                </a>
                <a className="text-link" href="#oferta">
                  Poznaj ofertę <span aria-hidden="true">-&gt;</span>
                </a>
              </div>
              <p className="hero-note">Zajęcia dla dzieci w wieku przedszkolnym i szkolnym</p>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="hero-sun" />
              <div className="hero-arch hero-arch-back" />
              <div className="hero-arch hero-arch-front" />
              <div className="note note-one">o</div>
              <div className="note note-two">o</div>
              <div className="note note-three">o</div>
              <p>W muzyce jest miejsce na każdy głos.</p>
            </div>
          </div>
        </section>

        <section className="intro-section" id="o-mnie" aria-labelledby="about-title">
          <div className="site-shell intro-grid">
            <div className="portrait-placeholder" role="img" aria-label="Miejsce na portret Magdaleny Warzechy-Hiller">
              <div className="portrait-sun" />
              <span>Portret<br />Magdaleny</span>
            </div>
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
                <h2 id="offer-title">Zajęcia, które rozwijają po swojemu.</h2>
              </div>
              <p>
                Wybierz formę zajęć, a szczegóły ustalimy spokojnie podczas rozmowy.
              </p>
            </div>
            <div className="offer-grid">
              {offers.map((offer) => (
                <article className="offer-card" key={offer.number}>
                  <span>{offer.number}</span>
                  <h3>{offer.title}</h3>
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
                Muzyka pomaga dziecku słuchać, wyrażać emocje i z większą
                swobodą być sobą. Dlatego dbamy o proces, nie o perfekcję.
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
              <p>Tu wkrótce pojawią się zdjęcia z zajęć i muzyczne inspiracje.</p>
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
              <h2 id="contact-title">Zobaczmy, czego potrzebuje Twoje dziecko.</h2>
              <p>
                Napisz kilka słów o dziecku i o tym, czego szukacie. Odpowiem i
                wspólnie ustalimy najlepszą formę pierwszego spotkania.
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
            <span className="brand-mark" aria-hidden="true">M</span>
            <span><strong>Moderato</strong><small>art</small></span>
          </a>
          <p>Muzyka i śpiew dla dzieci.</p>
          <p>© {new Date().getFullYear()} Moderato Art</p>
        </div>
      </footer>
    </>
  );
}
