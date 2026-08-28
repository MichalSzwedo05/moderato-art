import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGalleryPhotos } = vi.hoisted(() => ({ getGalleryPhotos: vi.fn() }));

vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("../gallery-viewer", () => ({ GalleryViewer: () => <div>Podgląd galerii</div> }));
vi.mock("../../lib/gallery-data", () => ({ getGalleryPhotos }));

import GalleryPage from "./page";

describe("GalleryPage", () => {
  beforeEach(() => {
    getGalleryPhotos.mockResolvedValue([]);
  });

  it("provides a contact button alongside the gallery navigation", async () => {
    render(await GalleryPage());

    expect(screen.getByRole("link", { name: "Przejdź do kontaktu" })).toHaveAttribute("href", "/kontakt");
  });
});
