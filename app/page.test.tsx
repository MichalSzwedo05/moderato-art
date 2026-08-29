import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublishedArticles: vi.fn().mockResolvedValue([]),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt?: string; src: string }) => createElement("img", { alt, src }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/contact-config", () => ({ isContactFormConfigured: vi.fn().mockReturnValue(false) }));
vi.mock("../lib/gallery-data", () => ({ getGalleryPhotos: vi.fn().mockResolvedValue([]) }));
vi.mock("../lib/public-articles", () => ({ getPublishedArticles: mocks.getPublishedArticles }));
vi.mock("./current-year", () => ({ CurrentYear: () => 2026 }));
vi.mock("./gallery-viewer", () => ({ GalleryViewer: () => null }));
vi.mock("./mobile-navigation", () => ({ MobileNavigation: () => null }));
vi.mock("./public-modals", () => ({
  OfferModalLink: ({ children }: { children: ReactNode }) => <a href="#oferta">{children}</a>,
  PublicModals: () => null,
}));
vi.mock("./scroll-reveal", () => ({
  ScrollReveal: ({ as = "div", children }: { as?: "article" | "div" | "figure"; children: ReactNode }) => {
    if (as === "article") return <article>{children}</article>;
    if (as === "figure") return <figure>{children}</figure>;
    return <div>{children}</div>;
  },
}));
vi.mock("./theme-switcher", () => ({ ThemeSwitcher: () => null }));

import HomePage from "./page";

describe("HomePage profile", () => {
  beforeEach(() => {
    mocks.getPublishedArticles.mockResolvedValue([]);
  });

  it("shows the original clear profile identity", async () => {
    render(await HomePage());

    expect(screen.getByRole("img", { name: "Magdalena Warzecha-Hiller" })).toHaveAttribute("src", "/magdalena-warzecha-hiller.jpg");
    expect(screen.getByText("Magdalena Warzecha-Hiller", { selector: "figcaption" })).toBeInTheDocument();
    expect(screen.getByText(/Magdalena Warzecha-Hiller jest sopranistką/)).toBeInTheDocument();
    expect(screen.queryByText(/Magdalena Kwiatkowska/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kontakt" })).toHaveAttribute("href", "/kontakt");
    expect(screen.getByRole("link", { name: "Zapisz się" })).toHaveAttribute("href", "/zgloszenie");
    expect(screen.getAllByRole("link", { name: "Zapytaj o zajęcia" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Zapytaj o zajęcia" }).every((link) => link.getAttribute("href") === "/kontakt")).toBe(true);
    expect(screen.queryByRole("link", { name: "+48 605 946 678" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pokaż numer telefonu" }));
    expect(screen.getByRole("link", { name: "+48 605 946 678" })).toHaveAttribute("href", "tel:+48605946678");
    expect(screen.getByRole("link", { name: "Przejdź do strony kontaktu" })).toHaveAttribute("href", "/kontakt");
    expect(screen.getByRole("heading", { name: "Rehabilitacja zaburzeń głosu" })).toBeInTheDocument();
    expect(screen.getByText(/created by:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Michał Szwedo" })).toHaveAttribute("href", "https://www.linkedin.com/in/micha%C5%82-szwedo-664337403");
  });

  it("does not apply blur or scale masking to the portrait image", () => {
    const styles = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");
    const portraitRule = styles.match(/\.portrait img\s*\{[\s\S]*?\}/)?.[0] || "";

    expect(portraitRule).not.toMatch(/filter\s*:\s*blur/);
    expect(portraitRule).not.toMatch(/transform\s*:\s*scale/);
  });

  it("hides the articles section when there are no published articles", async () => {
    render(await HomePage());

    expect(document.querySelector("#blog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Kilka słów o muzyce i dzieciach." })).not.toBeInTheDocument();
    expect(screen.queryByText("Pierwsze artykuły pojawią się wkrótce.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Artykuły" })).not.toBeInTheDocument();
  });

  it("shows the articles section when a published article exists", async () => {
    mocks.getPublishedArticles.mockResolvedValue([{
      category: "Muzyka",
      excerpt: "Kilka słów o muzyce.",
      publishedAt: "2026-08-25T12:00:00.000Z",
      slug: "pierwszy-artykul",
      title: "Pierwszy artykuł",
    }]);

    render(await HomePage());

    expect(screen.getByRole("heading", { name: "Kilka słów o muzyce i dzieciach." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pierwszy artykuł/ })).toHaveAttribute("href", "/articles/pierwszy-artykul");
    expect(screen.getByRole("link", { name: "Artykuły" })).toHaveAttribute("href", "#blog");
  });
});
