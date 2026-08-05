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
});
