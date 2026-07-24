"use client";

import { useEffect } from "react";

export function ScrollCanvas() {
  useEffect(() => {
    const root = document.documentElement;

    function updateCanvasColor() {
      const isScrollable = root.scrollHeight > window.innerHeight;
      const isAtBottom = isScrollable && window.scrollY + window.innerHeight >= root.scrollHeight - 1;
      root.toggleAttribute("data-scroll-end", isAtBottom);
    }

    const resizeObserver = new ResizeObserver(updateCanvasColor);

    updateCanvasColor();
    resizeObserver.observe(root);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", updateCanvasColor);
    window.addEventListener("scroll", updateCanvasColor, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateCanvasColor);
      window.removeEventListener("scroll", updateCanvasColor);
      root.removeAttribute("data-scroll-end");
    };
  }, []);

  return null;
}
