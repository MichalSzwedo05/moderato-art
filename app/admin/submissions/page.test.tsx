import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getContactSubmissions: vi.fn(),
  parseContactSubmissionQuery: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/contact-submissions", () => ({
  contactSubmissionFilters: ["ALL", "NEW", "CONTACTED", "ARCHIVED"],
  getContactSubmissions: mocks.getContactSubmissions,
  parseContactSubmissionQuery: mocks.parseContactSubmissionQuery,
}));

import SubmissionsPage from "./page";

describe("SubmissionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue({ mode: "password" });
    mocks.getAdminSession.mockResolvedValue({ id: "admin" });
    mocks.parseContactSubmissionQuery.mockReturnValue({ page: 1, status: "ALL" });
  });

  it("renders contact data as safe text with status and retention warning", async () => {
    mocks.getContactSubmissions.mockResolvedValue({
      hasNext: false,
      submissions: [{
        childAgeRange: "6-9",
        createdAt: new Date("2026-08-22T12:00:00.000Z"),
        deleteAfter: null,
        email: "anna@example.com",
        id: "submission",
        lessonType: "rytmika",
        message: "<script>alert(1)</script>\nProszę o kontakt.",
        parentName: "Anna Kowalska",
        phone: null,
        status: "NEW",
      }],
    });

    render(await SubmissionsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Zgłoszenia kontaktowe" })).toBeInTheDocument();
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument();
    expect(screen.getByText("Nowe", { selector: "span.admin-status" })).toBeInTheDocument();
    expect(screen.getByText("22 sie 2026, 14:00")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "<script>alert(1)</script>\nProszę o kontakt.")).toBeInTheDocument();
    expect(screen.getByText(/Brak ustawionego terminu retencji/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wróć do panelu" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("button", { name: "Pobierz XML" }).closest("form")).toHaveAttribute("action", "/api/admin/submissions/export");
  });

  it("renders every workflow status, optional contact fields, and pagination links", async () => {
    mocks.parseContactSubmissionQuery.mockReturnValue({ page: 2, status: "CONTACTED" });
    mocks.getContactSubmissions.mockResolvedValue({
      hasNext: true,
      submissions: ["CONTACTED", "ARCHIVED"].map((status, index) => ({
        childAgeRange: index === 0 ? "16-plus" : null,
        createdAt: new Date("2026-08-22T12:00:00.000Z"),
        deleteAfter: new Date("2026-09-01T12:00:00.000Z"),
        email: `person-${index}@example.com`,
        id: `submission-${index}`,
        lessonType: index === 0 ? "junior-voice" : null,
        message: `Wiadomość ${index}`,
        parentName: `Osoba ${index}`,
        phone: index === 0 ? "500 000 000" : null,
        status,
      })),
    });

    render(await SubmissionsPage({ searchParams: Promise.resolve({ page: "2", status: "CONTACTED" }) }));

    expect(screen.getByText("Skontaktowano się", { selector: "span.admin-status" })).toBeInTheDocument();
    expect(screen.getByText("Zarchiwizowane", { selector: "span.admin-status" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "500 000 000" })).toHaveAttribute("href", "tel:500 000 000");
    expect(screen.getAllByText("Planowane usunięcie: 1 wrz 2026, 14:00")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "← Nowsze" })).toHaveAttribute("href", "/admin/submissions?status=CONTACTED");
    expect(screen.getByRole("link", { name: "Starsze →" })).toHaveAttribute("href", "/admin/submissions?status=CONTACTED&page=3");
  });

  it("redirects an anonymous administrator before loading submissions", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });

    await expect(SubmissionsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(mocks.getContactSubmissions).not.toHaveBeenCalled();
  });

  it("shows a generic database error without submission data", async () => {
    mocks.getContactSubmissions.mockResolvedValue(undefined);

    render(await SubmissionsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Nie udało się wczytać zgłoszeń kontaktowych.")).toBeInTheDocument();
  });

  it("does not query submissions when the CMS is disabled", async () => {
    mocks.getAdminAuthConfig.mockReturnValue(undefined);

    render(await SubmissionsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Panel administracyjny jest chwilowo niedostępny.")).toBeInTheDocument();
    expect(mocks.getContactSubmissions).not.toHaveBeenCalled();
  });
});
