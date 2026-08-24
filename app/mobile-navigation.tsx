"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const navigationId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const navigation = navigationRef.current;

      if (event.target instanceof Node && navigation && !navigation.contains(event.target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    function closeNavigation() {
      setIsOpen(false);
    }

    window.addEventListener("theme-switcher-open", closeNavigation);

    return () => window.removeEventListener("theme-switcher-open", closeNavigation);
  }, []);

  function handleToggle() {
    if (!isOpen) {
      window.dispatchEvent(new Event("mobile-navigation-open"));
    }

    setIsOpen((open) => !open);
  }

  function handleNavigationClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) {
      setIsOpen(false);
    }
  }

  return (
    <div className="mobile-navigation" ref={navigationRef}>
      <button
        aria-controls={navigationId}
        aria-expanded={isOpen}
        className="mobile-menu-button"
        onClick={handleToggle}
        ref={buttonRef}
        type="button"
      >
        <span aria-hidden="true" className="mobile-menu-icon" data-open={isOpen}>
          <i />
          <i />
        </span>
        Menu
      </button>
      <nav aria-label="Nawigacja mobilna" data-open={isOpen} hidden={!isOpen} id={navigationId} onClick={handleNavigationClick}>
        <a href="#o-mnie">O mnie</a>
        <a href="#oferta">Oferta</a>
        <a href="#blog">Artykuły</a>
        <Link href="/kontakt">Kontakt</Link>
      </nav>
    </div>
  );
}
