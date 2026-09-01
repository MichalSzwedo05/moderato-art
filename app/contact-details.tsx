import Link from "next/link";
import { publicContact } from "../lib/public-contact";
import { PhoneReveal } from "./phone-reveal";

export function ContactDetails({ detailed = false }: { detailed?: boolean }) {
  return <div className={`contact-details${detailed ? " contact-details-detailed" : ""}`}>
    <p className="eyebrow">{detailed ? "Dane kontaktowe" : "Kontakt"}</p>
    {detailed ? <dl className="contact-details-list">
      <div><dt>Imię i nazwisko</dt><dd>{publicContact.name}</dd></div>
      <div><dt>E-mail</dt><dd><a className="contact-email" href={`mailto:${publicContact.email}`}>{publicContact.email}</a></dd></div>
      <div><dt>Telefon</dt><dd><PhoneReveal /></dd></div>
    </dl> : <div className="contact-phone-summary">
      <span className="contact-detail-label">Telefon</span>
      <PhoneReveal />
    </div>}
    {detailed ? null : <Link className="button button-primary contact-details-link" href="/kontakt">Przejdź do strony kontaktu</Link>}
  </div>;
}
