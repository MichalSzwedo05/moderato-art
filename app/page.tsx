import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { isContactFormConfigured } from "../lib/contact-config";
import { getPublishedArticles } from "../lib/public-articles";
import { ArticleLibrary } from "./article-library";
import { OfferModalLink, PublicModals } from "./public-modals";
import { ContactDetails } from "./contact-details";
import { CurrentYear } from "./current-year";
import { MobileNavigation } from "./mobile-navigation";
import { ScrollReveal } from "./scroll-reveal";
import { ThemeSwitcher } from "./theme-switcher";
import { GalleryViewer } from "./gallery-viewer";
import { getGalleryPhotos } from "../lib/gallery-data";
import { offers } from "../lib/offers";

const benefits = [
  "Uwaga i tempo dopasowane do dziecka",
  "Nauka przez zabawę i swobodne odkrywanie",
  "Troska o zdrową, świadomą pracę z głosem",
  "Spokojna przestrzeń do budowania odwagi",
];

export default async function HomePage() {
  await connection();
  const contactFormEnabled = isContactFormConfigured();
  const articles = await getPublishedArticles();
  const galleryPhotos = await getGalleryPhotos();

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
            <Link href="/kontakt">Kontakt</Link>
          </nav>
          <ThemeSwitcher />
          <MobileNavigation />
          <a className="header-action" href="#oferta">Zapytaj o zajęcia</a>
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
                <a className="button button-primary" href="#oferta">Zapytaj o zajęcia</a>
                <a className="text-link" href="#oferta">Sprawdź ofertę <span aria-hidden="true">-&gt;</span></a>
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
            <ScrollReveal as="figure" className="portrait" variant="left">
              <Image
                src="/magdalena-warzecha-hiller.jpg"
                alt="Magdalena Kwiatkowska"
                fill
                priority
                sizes="(max-width: 900px) min(100vw - 3rem, 30rem), 31vw"
              />
              <figcaption>Magdalena Kwiatkowska</figcaption>
            </ScrollReveal>
            <ScrollReveal className="intro-copy" delay={120} variant="right">
              <p className="eyebrow">Poznaj prowadzącą</p>
              <h2 id="about-title">Muzyka zaczyna się od uważnego słuchania.</h2>
              <p>
                Magdalena Kwiatkowska jest sopranistką, pedagogiem śpiewu i
                rehabilitantką zaburzeń głosu. W pracy z dziećmi łączy muzyczną
                wrażliwość z wiedzą o świadomej, bezpiecznej pracy z głosem.
              </p>
              <details className="biography-details">
                <summary>Dowiedz się więcej <span aria-hidden="true">↓</span></summary>
                <div>
                  <p>Każde spotkanie jest dopasowane do wieku, możliwości i tempa dziecka. Bez pośpiechu, za to z dużą dozą ciekawości, ruchu i wspólnego muzykowania.</p>
                  <p>Najważniejsze są swoboda, radość z muzykowania i budowanie pewności siebie — krok po kroku, w bezpiecznej atmosferze.</p>
                </div>
              </details>
            </ScrollReveal>
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
              {offers.map((offer, index) => (
                <ScrollReveal as="article" className="offer-card" delay={index * 100} key={offer.number}>
                  <span>{offer.number}</span>
                  <h3>{offer.title}</h3>
                  <p className="offer-subtitle">{offer.subtitle}</p>
                  <p className="offer-audience">{offer.audience}</p>
                  <p>{offer.description}</p>
                  <OfferModalLink aria-label={`Więcej o ${offer.title}`} offerId={offer.id}>Więcej <span aria-hidden="true">-&gt;</span></OfferModalLink>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="benefits-section" aria-labelledby="benefits-title">
          <div className="site-shell benefits-grid">
            <ScrollReveal>
              <p className="eyebrow">Dobra atmosfera</p>
              <h2 id="benefits-title">Ważna jest nie tylko melodia.</h2>
              <p className="benefits-intro">
                Muzyka pomaga słuchać, wyrażać emocje i z większą swobodą być
                sobą. Dlatego dbamy o proces, nie o perfekcję.
              </p>
            </ScrollReveal>
            <ScrollReveal as="div" delay={120} variant="right">
              <ul>
                {benefits.map((benefit) => (
                  <li key={benefit}>
                    <span aria-hidden="true">+</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
        </section>

        <section className="testimonials-section" aria-labelledby="testimonials-title">
          <div className="site-shell testimonials-grid">
            <div>
              <p className="eyebrow">Głosy rodziców</p>
              <h2 id="testimonials-title">Dobre słowa zostają z nami na długo.</h2>
              <p>Tu wkrótce pojawią się opinie osób, które poznały Moderato Art.</p>
            </div>
            <div className="testimonials-empty"><span aria-hidden="true">“</span><p>Przygotowujemy miejsce na pierwsze opinie rodziców i uczestników zajęć.</p></div>
          </div>
        </section>

        {galleryPhotos.length > 0 ? <section className="gallery-section" id="galeria" aria-labelledby="gallery-title">
          <div className="site-shell">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Przestrzeń do tworzenia</p>
                <h2 id="gallery-title">Miejsce, w którym muzyka się dzieje.</h2>
              </div>
              <a className="text-link" href="/galeria">Otwórz całą galerię</a>
            </div>
            <GalleryViewer compact photos={galleryPhotos.slice(0, 4)} />
          </div>
        </section> : null}

        <section className="blog-section" id="blog" aria-labelledby="blog-title">
          <div className="site-shell">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Czytelnia Moderato</p>
                <h2 id="blog-title">Kilka słów o muzyce i dzieciach.</h2>
              </div>
              <span className="text-link">Najnowsze artykuły</span>
            </div>
            <ArticleLibrary articles={articles} />
          </div>
        </section>

        <section className="contact-section" id="kontakt" aria-labelledby="contact-title">
          <div className="site-shell contact-grid">
            <ScrollReveal>
              <p className="eyebrow">Porozmawiajmy</p>
              <h2 id="contact-title">Znajdźmy zajęcia dla Ciebie lub Twojego dziecka.</h2>
              <p>
                Wybierz ofertę, aby zobaczyć szczegóły i skontaktować się w
                sprawie zajęć.
              </p>
              <ContactDetails />
            </ScrollReveal>
          </div>
        </section>
      </main>
      <PublicModals contactFormEnabled={contactFormEnabled} />

      <footer className="site-footer">
        <div className="site-shell footer-content">
          <a className="brand brand-footer" href="#start" aria-label="Moderato Art - powrót na początek">
            <span className="footer-brand-name">Moderato</span>
            <span className="brand-tagline">Muzyczna Kraina Malucha</span>
          </a>
          <p>Muzyka i śpiew dla dzieci.</p>
          <Link className="footer-legal-link" href="/polityka-prywatnosci">Polityka prywatności</Link>
          <p>© <CurrentYear /> Moderato Art</p>
        </div>
      </footer>
    </>
  );
}
