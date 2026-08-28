"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type MouseEvent, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";
import { offers, type OfferId } from "../lib/offers";
import { ContactDetails } from "./contact-details";
import { ContactForm } from "./contact-form";

function isOfferId(value: string | null): value is OfferId {
  return offers.some((offer) => offer.id === value);
}

function getModalFromLocation() {
  const modal = new URLSearchParams(window.location.search).get("modal");
  return isOfferId(modal) ? modal : undefined;
}

type OfferModalLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { href?: string; offerId: OfferId };

export function OfferModalLink({ children, href = "#oferta", offerId, ...props }: OfferModalLinkProps) {
  function openModal(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") return;

    event.preventDefault();
    window.dispatchEvent(new CustomEvent<OfferId>("moderato:open-offer", { detail: offerId }));
  }

  return <a aria-controls="offer-modal" aria-haspopup="dialog" href={href} onClick={openModal} {...props}>{children}</a>;
}

type PublicModalsProps = {
  contactFormEnabled?: boolean;
};

export function PublicModals({ contactFormEnabled = false }: PublicModalsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [modal, setModal] = useState<OfferId>();
  const openedByUser = useRef(false);
  const offer = offers.find((item) => item.id === modal);

  useEffect(() => {
    const fromLocation = () => { openedByUser.current = false; setModal(getModalFromLocation()); };
    const fromTrigger = (event: Event) => {
      const offerId = (event as CustomEvent<OfferId>).detail;
      if (!isOfferId(offerId)) return;
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      openedByUser.current = true;
      const url = new URL(window.location.href);
      url.searchParams.set("modal", offerId);
      window.history.pushState({}, "", url);
      setModal(offerId);
    };
    fromLocation();
    window.addEventListener("popstate", fromLocation);
    window.addEventListener("moderato:open-offer", fromTrigger);
    return () => {
      window.removeEventListener("popstate", fromLocation);
      window.removeEventListener("moderato:open-offer", fromTrigger);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal && typeof dialog.showModal !== "function") {
      const url = new URL(window.location.href);
      url.searchParams.delete("modal");
      window.history.replaceState({}, "", url);
      setModal(undefined);
      return;
    }
    if (modal && !dialog.open) dialog.showModal();
    if (modal) closeButtonRef.current?.focus();
    if (!modal && dialog.open) dialog.close();
  }, [modal]);

  function close() {
    const url = new URL(window.location.href);
    url.searchParams.delete("modal");
    if (openedByUser.current) {
      openedByUser.current = false;
      window.history.back();
    } else {
      window.history.replaceState({}, "", url);
      setModal(undefined);
    }
  }

  function restoreFocus() {
    if (openerRef.current && !openerRef.current.closest("[hidden]")) openerRef.current.focus();
    else document.querySelector<HTMLButtonElement>(".mobile-menu-button")?.focus();
  }

  function closeFromBackdrop(event: ReactPointerEvent<HTMLDialogElement>) {
    const { bottom, left, right, top } = event.currentTarget.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) event.currentTarget.close();
  }

  function closeFromCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    dialogRef.current?.close();
  }

  return <dialog aria-labelledby={titleId} className="public-modal" id="offer-modal" onCancel={closeFromCancel} onClose={() => { if (modal) close(); restoreFocus(); }} onPointerDown={closeFromBackdrop} ref={dialogRef}>
    <button aria-label="Zamknij okno" className="public-modal-close" onClick={() => dialogRef.current?.close()} ref={closeButtonRef} type="button">×</button>
    {offer && <>
      <section><p className="eyebrow">{offer.subtitle}</p><h2 id={titleId}>{offer.title}</h2><p className="offer-audience">{offer.audience}</p><div className="offer-modal-copy">{offer.modalParagraphs.map((paragraph, index) => <p key={`${offer.id}-${index}`}>{paragraph}</p>)}</div></section>
      {offer.contactMode === "form" ? <><ContactForm enabled={contactFormEnabled} key={offer.id} lessonTitle={offer.title} lessonType={offer.lessonType} /><Link className="button button-primary public-modal-contact-link" href="/kontakt">Przejdź do strony kontaktu</Link></> : <ContactDetails />}
    </>}
  </dialog>;
}
