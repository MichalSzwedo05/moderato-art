"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type RevealElement = "article" | "div" | "figure";
type RevealVariant = "fade" | "left" | "right" | "scale" | "up";

type ScrollRevealProps = Readonly<{
  as?: RevealElement;
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
}>;

export function ScrollReveal({
  as: Element = "div",
  children,
  className,
  delay = 0,
  variant = "up",
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.dataset.revealed = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        element.dataset.revealed = "true";
        observer.unobserve(element);
      },
      { rootMargin: "0px 0px -10%", threshold: 0.16 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;
  const classes = ["reveal", `reveal-${variant}`, className].filter(Boolean).join(" ");

  function setElementRef(element: HTMLElement | null) {
    elementRef.current = element;
  }

  return (
    <Element ref={setElementRef} className={classes} style={style}>
      {children}
    </Element>
  );
}
