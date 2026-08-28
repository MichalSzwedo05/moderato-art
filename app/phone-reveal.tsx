"use client";

import { useId, useState } from "react";

const phoneNumber = ["+48", "605", "946", "678"].join(" ");
const phoneHref = `tel:${phoneNumber.replaceAll(" ", "")}`;

export function PhoneReveal() {
  const [isRevealed, setIsRevealed] = useState(false);
  const phoneId = useId();

  return <div className="phone-reveal">
    <div aria-live="polite" id={phoneId}>
      {isRevealed ? <a className="contact-phone" href={phoneHref}>{phoneNumber}</a> : <span className="phone-reveal-placeholder">Numer telefonu jest ukryty.</span>}
    </div>
    <button aria-controls={phoneId} aria-expanded={isRevealed} className="button contact-phone-reveal-button" onClick={() => setIsRevealed((visible) => !visible)} type="button">
      {isRevealed ? "Ukryj numer telefonu" : "Pokaż numer telefonu"}
    </button>
  </div>;
}
