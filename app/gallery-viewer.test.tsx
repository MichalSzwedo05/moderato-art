/* eslint-disable @next/next/no-img-element -- Next Image is mocked in this component test. */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { galleryPhotos } from "../lib/gallery";
import { GalleryViewer } from "./gallery-viewer";

vi.mock("next/image", () => ({ default: ({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} /> }));

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

describe("GalleryViewer", () => {
  it("moves between photos with keyboard arrows and closes when clicking the backdrop", async () => {
    render(<GalleryViewer photos={galleryPhotos} />);

    fireEvent.click(screen.getByRole("link", { name: galleryPhotos[0].alt }));
    expect(screen.getByText(/zdjęcie 1 z 4/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/zdjęcie 2 z 4/)).toBeInTheDocument();
    screen.getByRole("button", { name: "Poprzednie zdjęcie" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText(/zdjęcie 1 z 4/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/zdjęcie 1 z 4/)).toBeInTheDocument();

    const dialog = document.querySelector<HTMLDialogElement>(".gallery-lightbox")!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 100, 400, 400));
    fireEvent.pointerDown(dialog, { clientX: 50, clientY: 50 });
    expect(screen.queryByText(/zdjęcie 1 z 4/)).not.toBeInTheDocument();
  });

  it("moves between photos with horizontal touch swipes and ignores vertical gestures", () => {
    render(<GalleryViewer photos={galleryPhotos} />);

    fireEvent.click(screen.getByRole("link", { name: galleryPhotos[0].alt }));
    const figure = document.querySelector("figure")!;
    vi.spyOn(document.querySelector<HTMLDialogElement>(".gallery-lightbox")!, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 400, 400));
    const swipe = (startX: number, endX: number, startY = 200, endY = 200, pointerId = 1) => {
      fireEvent.pointerDown(figure, { clientX: startX, clientY: startY, pointerId, pointerType: "touch" });
      fireEvent.pointerUp(figure, { clientX: endX, clientY: endY, pointerId, pointerType: "touch" });
    };

    swipe(300, 200);
    expect(screen.getByText(/zdjęcie 2 z 4/)).toBeInTheDocument();
    swipe(200, 300, 200, 200, 2);
    expect(screen.getByText(/zdjęcie 1 z 4/)).toBeInTheDocument();
    swipe(300, 200, 200, 300, 3);
    expect(screen.getByText(/zdjęcie 1 z 4/)).toBeInTheDocument();
    swipe(200, 300, 200, 200, 4);
    expect(screen.getByText(/zdjęcie 1 z 4/)).toBeInTheDocument();

    swipe(300, 200, 200, 200, 5);
    swipe(300, 200, 200, 200, 6);
    swipe(300, 200, 200, 200, 7);
    expect(screen.getByText(/zdjęcie 4 z 4/)).toBeInTheDocument();
    swipe(200, 300, 200, 200, 8);
    expect(screen.getByText(/zdjęcie 3 z 4/)).toBeInTheDocument();
  });

  it("ignores short, mouse, cancelled, mismatched, and button-originated gestures", () => {
    render(<GalleryViewer photos={galleryPhotos} />);

    fireEvent.click(screen.getByRole("link", { name: galleryPhotos[0].alt }));
    const figure = document.querySelector("figure")!;
    const dialog = document.querySelector<HTMLDialogElement>(".gallery-lightbox")!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 500, 500));
    const nextButton = screen.getByRole("button", { name: "Następne zdjęcie" });

    fireEvent.pointerDown(figure, { clientX: 300, clientY: 200, pointerId: 1, pointerType: "touch" });
    fireEvent.pointerUp(figure, { clientX: 260, clientY: 200, pointerId: 1, pointerType: "touch" });
    fireEvent.pointerDown(figure, { clientX: 300, clientY: 200, pointerId: 2, pointerType: "mouse" });
    fireEvent.pointerUp(figure, { clientX: 200, clientY: 200, pointerId: 2, pointerType: "mouse" });
    fireEvent.pointerDown(nextButton, { clientX: 300, clientY: 200, pointerId: 3, pointerType: "touch" });
    fireEvent.pointerUp(nextButton, { clientX: 200, clientY: 200, pointerId: 3, pointerType: "touch" });
    fireEvent.pointerDown(figure, { clientX: 300, clientY: 200, pointerId: 4, pointerType: "touch" });
    fireEvent.pointerUp(figure, { clientX: 200, clientY: 200, pointerId: 5, pointerType: "touch" });
    fireEvent.pointerDown(figure, { clientX: 300, clientY: 200, pointerId: 6, pointerType: "touch" });
    fireEvent.pointerCancel(figure, { pointerId: 6, pointerType: "touch" });
    fireEvent.pointerUp(figure, { clientX: 200, clientY: 200, pointerId: 6, pointerType: "touch" });
    fireEvent.pointerDown(figure, { clientX: 300, clientY: 200, pointerId: 7, pointerType: "" });
    fireEvent.pointerUp(figure, { clientX: 200, clientY: 200, pointerId: 7, pointerType: "" });
    fireEvent.pointerDown(figure, { clientX: 300, clientY: 200, pointerId: 8, pointerType: "unknown" });
    fireEvent.pointerUp(figure, { clientX: 200, clientY: 200, pointerId: 8, pointerType: "unknown" });

    expect(screen.getByText(/zdjęcie 1 z 4/)).toBeInTheDocument();
  });
});
