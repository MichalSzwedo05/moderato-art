import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
