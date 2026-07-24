import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollReveal } from "./scroll-reveal";

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallback: ObserverCallback | undefined;

class MockIntersectionObserver {
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }

  disconnect() {}

  observe() {}

  unobserve() {}
}

describe("ScrollReveal", () => {
  beforeEach(() => {
    observerCallback = undefined;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks an element as revealed after it enters the viewport", () => {
    render(
      <ScrollReveal delay={100} variant="scale">
        <p>Animowana treść</p>
      </ScrollReveal>,
    );

    const revealElement = screen.getByText("Animowana treść").parentElement;

    expect(revealElement).not.toHaveAttribute("data-revealed");

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(revealElement).toHaveAttribute("data-revealed", "true");
  });
});
