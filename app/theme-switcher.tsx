"use client";

import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";

type ThemeVariant = "signature" | "ocean" | "sunrise";

const variants: { value: ThemeVariant; label: string }[] = [
  { value: "signature", label: "Wizytówka" },
  { value: "ocean", label: "Ocean" },
  { value: "sunrise", label: "Morela" },
];

export function ThemeSwitcher() {
  const [variant, setVariant] = useState<ThemeVariant>("signature");
  const [darkMode, setDarkMode] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    document.documentElement.dataset.variant = variant;
    document.documentElement.dataset.mode = darkMode ? "dark" : "light";

    return () => {
      delete document.documentElement.dataset.variant;
      delete document.documentElement.dataset.mode;
    };
  }, [darkMode, variant]);

  useEffect(() => {
    function closeSwitcher() {
      detailsRef.current?.removeAttribute("open");
    }

    window.addEventListener("mobile-navigation-open", closeSwitcher);

    return () => window.removeEventListener("mobile-navigation-open", closeSwitcher);
  }, []);

  function handleVariantChange(event: ChangeEvent<HTMLInputElement>) {
    setVariant(event.target.value as ThemeVariant);
  }

  function handleDarkModeChange(event: ChangeEvent<HTMLInputElement>) {
    setDarkMode(event.target.checked);
  }

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open) {
      window.dispatchEvent(new Event("theme-switcher-open"));
    }
  }

  return (
    <details className="theme-switcher" onToggle={handleToggle} ref={detailsRef}>
      <summary>Wygląd</summary>
      <div className="theme-panel">
        <fieldset>
          <legend>Wariant kolorystyczny</legend>
          {variants.map((theme) => (
            <label className="theme-option" key={theme.value}>
              <input
                checked={variant === theme.value}
                name="theme-variant"
                onChange={handleVariantChange}
                type="radio"
                value={theme.value}
              />
              <span>{theme.label}</span>
            </label>
          ))}
        </fieldset>
        <label className="dark-mode-toggle">
          <input checked={darkMode} onChange={handleDarkModeChange} type="checkbox" />
          <span>Tryb ciemny</span>
        </label>
      </div>
    </details>
  );
}
