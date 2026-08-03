"use client";

import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type MouseEvent } from "react";

function getModalFromLocation() {
  return new URLSearchParams(window.location.search).get("modal") === "offers" ? "offers" : undefined;
}

type OfferModalLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { href?: string };

export function OfferModalLink({ children, href = "#oferta", ...props }: OfferModalLinkProps) {
  function openModal(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") {
      return;
    }

    event.preventDefault();
    window.dispatchEvent(new Event("moderato:open-offers"));
  }

  return <a aria-controls="offer-modal" aria-haspopup="dialog" href={href} onClick={openModal} {...props}>{children}</a>;
}

export function PublicModals() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [modal, setModal] = useState<"offers">();
  const openedByUser = useRef(false);

  useEffect(() => {
    const fromLocation = () => { openedByUser.current = false; setModal(getModalFromLocation()); };
    const fromTrigger = () => {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      openedByUser.current = true;
      const url = new URL(window.location.href);
      url.searchParams.set("modal", "offers");
      window.history.pushState({}, "", url);
      setModal("offers");
    };
    fromLocation();
    window.addEventListener("popstate", fromLocation);
    window.addEventListener("moderato:open-offers", fromTrigger);
    return () => {
      window.removeEventListener("popstate", fromLocation);
      window.removeEventListener("moderato:open-offers", fromTrigger);
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

  return <dialog aria-labelledby={titleId} className="public-modal" id="offer-modal" onClose={() => { if (modal) close(); restoreFocus(); }} ref={dialogRef}>
    <button aria-label="Zamknij okno" className="public-modal-close" onClick={() => dialogRef.current?.close()} type="button">×</button>
    {modal === "offers" && <section><p className="eyebrow">Oferta</p><h2 id={titleId}>Znajdź swój rytm i własny głos.</h2><ul className="public-modal-list"><li><strong>Rytmisolki</strong><span>Zajęcia muzyczno-rytmiczne dla przedszkolaków.</span></li><li><strong>Junior Voice</strong><span>Grupowe lekcje śpiewu dla dzieci.</span></li><li><strong>Studio Wokalne</strong><span>Indywidualna praca z głosem.</span></li></ul></section>}
  </dialog>;
}
