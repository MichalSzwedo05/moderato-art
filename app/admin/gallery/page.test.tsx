import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthConfig: vi.fn(),
  getAdminGalleryPhotos: vi.fn(),
  getAdminSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, usePathname: () => "/admin/gallery" }));
vi.mock("../admin-panel", () => ({ AdminPanel: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }));
vi.mock("../gallery-manager", () => ({ GalleryManager: ({ initialPhotos }: { initialPhotos: unknown[] }) => <div>Zarządzanie galerią ({initialPhotos.length})</div> }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/gallery-data", () => ({ getAdminGalleryPhotos: mocks.getAdminGalleryPhotos }));

import AdminGalleryPage from "./page";

describe("AdminGalleryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "password" });
    mocks.getAdminSession.mockResolvedValue({ id: "admin" });
    mocks.getAdminGalleryPhotos.mockResolvedValue([]);
  });

  it("renders the gallery manager for a valid gallery", async () => {
    render(await AdminGalleryPage());

    expect(screen.getByRole("heading", { level: 1, name: "Galeria zdjęć" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Galeria zdjęć" })).toBeInTheDocument();
    expect(screen.getByText("Zarządzanie galerią (0)")).toBeInTheDocument();
  });

  it("keeps the page reachable with a notice when the gallery query fails", async () => {
    mocks.getAdminGalleryPhotos.mockResolvedValue(undefined);

    render(await AdminGalleryPage());

    expect(screen.getByText("Galeria jest chwilowo niedostępna. Zarządzanie artykułami pozostaje dostępne.")).toBeInTheDocument();
    expect(screen.queryByText(/Zarządzanie galerią/)).not.toBeInTheDocument();
  });

  it("redirects an anonymous administrator", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });

    await expect(AdminGalleryPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("keeps a public-site link when the CMS is disabled", async () => {
    mocks.getAdminAuthConfig.mockReturnValue(undefined);

    render(await AdminGalleryPage());

    expect(screen.getByText("Panel administracyjny jest chwilowo niedostępny.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Strona główna" })).toHaveAttribute("href", "/");
  });
});
