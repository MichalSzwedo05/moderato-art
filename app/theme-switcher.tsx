"use client";

import { useEffect } from "react";

const VARIANT = "signature";

export function ThemeSwitcher() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(mode: "dark" | "light") {
      document.documentElement.dataset.variant = VARIANT;
      document.documentElement.dataset.mode = mode;
    }

    apply(query.matches ? "dark" : "light");

    function handleChange(event: MediaQueryListEvent) {
      apply(event.matches ? "dark" : "light");
    }

    query.addEventListener("change", handleChange);

    return () => {
      query.removeEventListener("change", handleChange);
      delete document.documentElement.dataset.variant;
      delete document.documentElement.dataset.mode;
    };
  }, []);

  return null;
}
