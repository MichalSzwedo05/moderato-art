import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, usePathname: () => "/admin/password" }));
vi.mock("../admin-panel", () => ({ AdminPanel: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }));
vi.mock("../change-password-form", () => ({ ChangePasswordForm: () => <div>Formularz zmiany hasła</div> }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));

import AdminPasswordPage from "./page";

describe("AdminPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "password" });
    mocks.getAdminSession.mockResolvedValue({ id: "admin" });
  });

  it("renders the change-password form in password mode", async () => {
    render(await AdminPasswordPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Zmiana hasła" })).toBeInTheDocument();
    expect(screen.getByText("Formularz zmiany hasła")).toBeInTheDocument();
  });

  it("renders the password-changed success message", async () => {
    render(await AdminPasswordPage({ searchParams: Promise.resolve({ password: "changed" }) }));

    expect(screen.getByText("Hasło administratora zostało zmienione.")).toBeInTheDocument();
  });

  it("explains that password change is unavailable outside password mode", async () => {
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "magic_link" });

    render(await AdminPasswordPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Zmiana hasła nie jest dostępna w tym trybie logowania.")).toBeInTheDocument();
    expect(screen.queryByText("Formularz zmiany hasła")).not.toBeInTheDocument();
  });

  it("redirects an anonymous administrator", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });

    await expect(AdminPasswordPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });
});
