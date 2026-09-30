import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  articleCreate: vi.fn(),
  articleUpdate: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  headers: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ article: { create: mocks.articleCreate, update: mocks.articleUpdate } }) }));

import { createArticle, updateArticle } from "./actions";

function articleForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [name, value] of Object.entries({
    category: "Śpiew",
    content: "Treść artykułu",
    excerpt: "Krótki opis",
    imageUrl: "",
    slug: "pierwszy-artykul",
    status: "DRAFT",
    title: "Pierwszy artykuł",
    ...overrides,
  })) {
    formData.set(name, value);
  }
  return formData;
}

describe("article actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers({ origin: "https://www.moderato-art.pl" }));
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "password" });
    mocks.getAdminSession.mockResolvedValue({ username: "admin" });
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.articleCreate.mockResolvedValue({ id: "article-1" });
    mocks.articleUpdate.mockResolvedValue({ id: "article-1" });
  });

  it("returns the admin to the articles page after creating an article", async () => {
    await createArticle(articleForm());

    expect(mocks.articleCreate).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/articles?article=created");
  });

  it("returns the admin to the articles page after updating an article", async () => {
    await updateArticle("article-1", articleForm({ title: "Zaktualizowany" }));

    expect(mocks.articleUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "article-1" } }));
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/articles?article=updated");
  });

  it("reports invalid input on the articles page instead of writing", async () => {
    await createArticle(articleForm({ slug: "Nie poprawny slug" }));

    expect(mocks.articleCreate).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/articles?article=invalid");
  });

  it("reports a failed write on the articles page", async () => {
    mocks.articleCreate.mockRejectedValue(new Error("database down"));

    await createArticle(articleForm());

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/articles?article=invalid");
  });

  it("never redirects to the gallery route that swallows the notice", async () => {
    await createArticle(articleForm());
    await updateArticle("article-1", articleForm());
    await createArticle(articleForm({ status: "INVALID" }));

    for (const [target] of mocks.redirect.mock.calls) {
      expect(String(target)).toMatch(/^\/admin\/articles\?article=/);
    }
  });

  it("does not write without a valid session and same-origin request", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    await createArticle(articleForm());

    expect(mocks.articleCreate).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/articles?article=invalid");
  });

  it("publishes with a timestamp and revalidates the articles page", async () => {
    await createArticle(articleForm({ status: "PUBLISHED" }));

    expect(mocks.articleCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ publishedAt: expect.any(Date) }),
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/articles");
  });

  it("leaves publishedAt empty for drafts", async () => {
    await createArticle(articleForm({ status: "DRAFT" }));

    expect(mocks.articleCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ publishedAt: null }),
    }));
  });
});
