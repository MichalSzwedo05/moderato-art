import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfferModalLink, PublicModals } from "./public-modals";

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function close(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); },
  });
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("PublicModals", () => {
  it("shows the selected offer and closes when clicking the backdrop", () => {
    render(<><OfferModalLink offerId="junior-voice">Więcej o Junior Voice</OfferModalLink><PublicModals /></>);

    fireEvent.click(screen.getByRole("link", { name: "Więcej o Junior Voice" }));
    expect(screen.getByRole("heading", { name: "Junior Voice" })).toBeInTheDocument();
    expect(screen.getByText("Grupowe lekcje śpiewu")).toBeInTheDocument();

    const dialog = document.querySelector<HTMLDialogElement>(".public-modal")!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 100, 400, 400));
    fireEvent.pointerDown(dialog, { clientX: 50, clientY: 50 });
    expect(screen.queryByRole("heading", { name: "Junior Voice" })).not.toBeInTheDocument();
  });

  it.each([
    ["junior-voice", "Junior Voice", "junior-voice"],
    ["studio-wokalne", "Studio Wokalne", "studio-wokalne"],
  ] as const)("shows a form for %s with the offer fixed", (offerId, title, lessonType) => {
    render(<><OfferModalLink offerId={offerId}>Otwórz {title}</OfferModalLink><PublicModals contactFormTestEnabled /></>);

    fireEvent.click(screen.getByRole("link", { name: `Otwórz ${title}` }));

    expect(screen.getByText("Wybrane zajęcia")).toBeInTheDocument();
    expect(screen.getByText(title, { selector: "strong" })).toBeInTheDocument();
    expect(document.querySelector('input[name="lessonType"]')).toHaveValue(lessonType);
    expect(document.querySelector(".public-modal form")).not.toBeNull();
    expect(screen.queryByLabelText("Rodzaj zajęć")).not.toBeInTheDocument();
  });

  it("shows only contact details for Rytmisolki", () => {
    render(<><OfferModalLink offerId="rytmisolki">Otwórz Rytmisolki</OfferModalLink><PublicModals contactFormTestEnabled /></>);

    fireEvent.click(screen.getByRole("link", { name: "Otwórz Rytmisolki" }));

    expect(screen.getByRole("heading", { name: "Rytmisolki" })).toBeInTheDocument();
    expect(screen.getByText(/Dane kontaktowe zostaną uzupełnione/)).toBeInTheDocument();
    expect(document.querySelector(".public-modal form")).toBeNull();
  });

  it("opens from a direct URL, focuses close, and closes on Escape", () => {
    window.history.replaceState({}, "", "/?modal=studio-wokalne");
    render(<PublicModals />);

    expect(screen.getByRole("heading", { name: "Studio Wokalne" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zamknij okno" })).toHaveFocus();

    document.querySelector<HTMLDialogElement>(".public-modal")!.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));

    expect(window.location.search).toBe("");
    expect(screen.queryByRole("heading", { name: "Studio Wokalne" })).not.toBeInTheDocument();
  });

  it("removes the modal URL and restores focus after a user closes the modal", () => {
    const historyBack = vi.spyOn(window.history, "back").mockImplementation(() => {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    render(<><OfferModalLink offerId="junior-voice">Otwórz Junior Voice</OfferModalLink><PublicModals /></>);

    const opener = screen.getByRole("link", { name: "Otwórz Junior Voice" });
    opener.focus();
    fireEvent.click(opener);
    expect(window.location.search).toBe("?modal=junior-voice");

    fireEvent.click(screen.getByRole("button", { name: "Zamknij okno" }));

    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
    expect(opener).toHaveFocus();
    historyBack.mockRestore();
  });
});
