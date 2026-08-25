import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminGalleryPhotos: vi.fn(),
  getAdminSession: vi.fn(),
}));

vi.mock("./actions", () => ({ createArticle: vi.fn(), updateArticle: vi.fn() }));
vi.mock("./article-editor", () => ({ ArticleEditor: () => <div>Edytor artykułu</div> }));
vi.mock("./article-editor-details", () => ({ ArticleEditorDetails: () => <div>Szczegóły artykułu</div> }));
vi.mock("./delete-article-button", () => ({ DeleteArticleButton: () => <button type="button">Usuń artykuł</button> }));
vi.mock("./download-user-guide-button", () => ({ DownloadUserGuideButton: () => <button type="button">Pobierz instrukcję</button> }));
vi.mock("./gallery-manager", () => ({ GalleryManager: () => <div>Zarządzanie galerią</div> }));
vi.mock("@/lib/admin-auth", () => ({
  getAdminAuthConfig: mocks.getAdminAuthConfig,
  getAdminSession: mocks.getAdminSession,
}));
vi.mock("@/lib/gallery-data", () => ({ getAdminGalleryPhotos: mocks.getAdminGalleryPhotos }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ article: { findMany: mocks.findMany } }) }));

import AdminPage from "./page";

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "password" });
    mocks.getAdminSession.mockResolvedValue({ id: "admin" });
    mocks.findMany.mockResolvedValue([{
      category: "Śpiew",
      content: "Treść",
      excerpt: "Opis",
      id: "article",
      imageUrl: null,
      slug: "pierwszy-artykul",
      status: "DRAFT",
      title: "Pierwszy artykuł",
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    }]);
  });

  it("keeps article management available when the gallery query fails", async () => {
    mocks.getAdminGalleryPhotos.mockResolvedValue(undefined);

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Galeria jest chwilowo niedostępna. Zarządzanie artykułami pozostaje dostępne.")).toBeInTheDocument();
    expect(screen.getByText("Pierwszy artykuł")).toBeInTheDocument();
    expect(screen.getByText("Edytor artykułu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usuń artykuł" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pobierz instrukcję" })).toBeInTheDocument();
    expect(screen.queryByText("Zarządzanie galerią")).not.toBeInTheDocument();
  });

  it("renders the gallery manager for a valid empty gallery", async () => {
    mocks.getAdminGalleryPhotos.mockResolvedValue([]);

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Zarządzanie galerią")).toBeInTheDocument();
    expect(screen.queryByText(/Galeria jest chwilowo niedostępna/)).not.toBeInTheDocument();
  });

  it("keeps the whole panel unavailable when article loading fails", async () => {
    mocks.findMany.mockRejectedValue(new Error("database unavailable"));
    mocks.getAdminGalleryPhotos.mockResolvedValue([]);

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Panel administracyjny jest chwilowo niedostępny.")).toBeInTheDocument();
    expect(screen.queryByText("Edytor artykułu")).not.toBeInTheDocument();
  });
});
