/* eslint-disable @next/next/no-img-element -- Next Image is mocked in this component test. */
import { render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublishedArticle } = vi.hoisted(() => ({ getPublishedArticle: vi.fn() }));

vi.mock("next/image", () => ({ default: ({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("react-markdown", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("../../../lib/public-articles", () => ({ getPublishedArticle }));

import ArticlePage from "./page";

describe("ArticlePage", () => {
  beforeEach(() => {
    getPublishedArticle.mockResolvedValue({
      category: "Muzyka",
      content: "Treść artykułu",
      excerpt: "Krótki opis.",
      imageUrl: null,
      publishedAt: new Date("2026-08-25T12:00:00.000Z"),
      slug: "pierwszy-artykul",
      title: "Pierwszy artykuł",
    });
  });

  it("provides a contact button after the article", async () => {
    render(await ArticlePage({ params: Promise.resolve({ slug: "pierwszy-artykul" }) }));

    expect(screen.getByRole("link", { name: /porozmawiajmy o zajęciach/i })).toHaveAttribute("href", "/kontakt");
  });
});
