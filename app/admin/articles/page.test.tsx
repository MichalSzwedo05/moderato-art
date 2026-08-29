import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, usePathname: () => "/admin/articles" }));
vi.mock("../actions", () => ({ createArticle: vi.fn(), updateArticle: vi.fn() }));
vi.mock("../admin-panel", () => ({ AdminPanel: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }));
vi.mock("../article-editor", () => ({ ArticleEditor: () => <div>Edytor artykułu</div> }));
vi.mock("../article-editor-details", () => ({ ArticleEditorDetails: () => <div>Szczegóły artykułu</div> }));
vi.mock("../delete-article-button", () => ({ DeleteArticleButton: () => <button type="button">Usuń artykuł</button> }));
vi.mock("../article-list-status", () => ({ ArticleListStatus: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ article: { findMany: mocks.findMany } }) }));

import AdminArticlesPage from "./page";

const article = {
  category: "Śpiew",
  content: "Treść",
  excerpt: "Opis",
  id: "article",
  imageUrl: null,
  slug: "pierwszy-artykul",
  status: "DRAFT",
  title: "Pierwszy artykuł",
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

describe("AdminArticlesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "password" });
    mocks.getAdminSession.mockResolvedValue({ id: "admin" });
    mocks.findMany.mockResolvedValue([article]);
  });

  it("surfaces article status messages and lists articles", async () => {
    render(await AdminArticlesPage({ searchParams: Promise.resolve({ article: "created" }) }));

    expect(screen.getByRole("heading", { name: "Zarządzanie artykułami" })).toBeInTheDocument();
    expect(screen.getByText("Artykuł został zapisany.")).toBeInTheDocument();
    expect(screen.getByText("Pierwszy artykuł")).toBeInTheDocument();
    expect(screen.getByText("Edytor artykułu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usuń artykuł" })).toBeInTheDocument();
    expect(screen.getByText(/Śpiew · \/articles\/pierwszy-artykul · Szkic/)).toBeInTheDocument();
  });

  it("renders the invalid message for a failing article save", async () => {
    render(await AdminArticlesPage({ searchParams: Promise.resolve({ article: "invalid" }) }));

    expect(screen.getByText("Nie udało się zapisać artykułu. Sprawdź pola oraz unikalność slugu.")).toBeInTheDocument();
  });

  it("redirects an anonymous administrator", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });

    await expect(AdminArticlesPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("keeps the whole panel unavailable when article loading fails", async () => {
    mocks.findMany.mockRejectedValue(new Error("database unavailable"));

    render(await AdminArticlesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Panel administracyjny jest chwilowo niedostępny.")).toBeInTheDocument();
    expect(screen.queryByText("Edytor artykułu")).not.toBeInTheDocument();
  });
});
