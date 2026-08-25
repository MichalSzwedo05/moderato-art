import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt?: string; src: string }) => createElement("img", { alt, src }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../lib/contact-config", () => ({ isContactFormConfigured: vi.fn().mockReturnValue(false) }));
vi.mock("../lib/gallery-data", () => ({ getGalleryPhotos: vi.fn().mockResolvedValue([]) }));
vi.mock("../lib/public-articles", () => ({ getPublishedArticles: vi.fn().mockResolvedValue([]) }));
vi.mock("./article-library", () => ({ ArticleLibrary: () => null }));
vi.mock("./contact-details", () => ({ ContactDetails: () => null }));
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
  it("shows the original clear profile identity", async () => {
    render(await HomePage());

    expect(screen.getByRole("img", { name: "Magdalena Warzecha-Hiller" })).toHaveAttribute("src", "/magdalena-warzecha-hiller.jpg");
    expect(screen.getByText("Magdalena Warzecha-Hiller", { selector: "figcaption" })).toBeInTheDocument();
    expect(screen.getByText(/Magdalena Warzecha-Hiller jest sopranistką/)).toBeInTheDocument();
    expect(screen.queryByText(/Magdalena Kwiatkowska/)).not.toBeInTheDocument();
  });

  it("does not apply blur or scale masking to the portrait image", () => {
    const styles = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");
    const portraitRule = styles.match(/\.portrait img\s*\{[\s\S]*?\}/)?.[0] || "";

    expect(portraitRule).not.toMatch(/filter\s*:\s*blur/);
    expect(portraitRule).not.toMatch(/transform\s*:\s*scale/);
  });
});
