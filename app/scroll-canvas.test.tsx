import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollCanvas } from "./scroll-canvas";

let resizeObserverCallback: ResizeObserverCallback | undefined;
let scrollHeight = 1000;

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }

  disconnect() {}

  observe() {}
}

describe("ScrollCanvas", () => {
  beforeEach(() => {
    resizeObserverCallback = undefined;
    scrollHeight = 1000;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 500 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockImplementation(() => scrollHeight);
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-scroll-end");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the footer canvas only at the bottom of a scrollable document", () => {
    const { unmount } = render(<ScrollCanvas />);

    expect(document.documentElement).not.toHaveAttribute("data-scroll-end");

    Object.defineProperty(window, "scrollY", { configurable: true, value: 500, writable: true });
    window.dispatchEvent(new Event("scroll"));

    expect(document.documentElement).toHaveAttribute("data-scroll-end");

    unmount();
    expect(document.documentElement).not.toHaveAttribute("data-scroll-end");
  });

  it("updates the canvas when document height changes", () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 500, writable: true });
    render(<ScrollCanvas />);

    expect(document.documentElement).toHaveAttribute("data-scroll-end");

    scrollHeight = 1400;
    act(() => {
      resizeObserverCallback?.([] as ResizeObserverEntry[], {} as ResizeObserver);
    });

    expect(document.documentElement).not.toHaveAttribute("data-scroll-end");
  });

  it("keeps the top canvas on short documents", () => {
    scrollHeight = 500;
    render(<ScrollCanvas />);

    expect(document.documentElement).not.toHaveAttribute("data-scroll-end");
  });
});
