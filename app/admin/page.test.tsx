import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin-auth", () => ({
  getAdminAuthConfig: mocks.getAdminAuthConfig,
  getAdminSession: mocks.getAdminSession,
}));

import AdminPage from "./page";

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "password" });
    mocks.getAdminSession.mockResolvedValue({ id: "admin" });
  });

  it("keeps a public-site link when the CMS is disabled", async () => {
    mocks.getAdminAuthConfig.mockReturnValue(undefined);

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "Strona główna" })).toHaveAttribute("href", "/");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("shows the password login form when there is no session", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Panel administracyjny" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nazwa użytkownika")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasło")).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects an authenticated administrator to the gallery by default", async () => {
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });

    await expect(AdminPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/gallery");
  });
});
