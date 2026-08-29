import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
const { isContactFormConfigured } = vi.hoisted(() => ({ isContactFormConfigured: vi.fn() }));
vi.mock("../../lib/contact-config", () => ({ isContactFormConfigured }));

import ZgloszeniePage, { metadata } from "./page";

describe("ZgloszeniePage", () => {
  beforeEach(() => {
    isContactFormConfigured.mockReturnValue(true);
  });

  it("renders the standalone form without contact details and a link back to the home page", async () => {
    render(await ZgloszeniePage());

    expect(screen.getByRole("heading", { level: 1, name: /zapisz się na zajęcia/i })).toBeInTheDocument();
    expect(screen.getAllByRole("group")[0]).not.toBeDisabled();
    expect(screen.getByLabelText(/rodzaj zajęć/i)).toBeRequired();
    expect(screen.getByRole("link", { name: /wróć na stronę główną/i })).toHaveAttribute("href", "/");
    expect(screen.queryByText("Magdalena Warzecha-Hiller", { selector: "dd" })).not.toBeInTheDocument();
    expect(screen.queryByText("6621786684", { selector: "dd" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pokaż numer telefonu" })).not.toBeInTheDocument();
  });

  it("keeps the form disabled when production configuration is incomplete", async () => {
    isContactFormConfigured.mockReturnValue(false);

    render(await ZgloszeniePage());

    expect(screen.getAllByRole("group")[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: /formularz chwilowo niedostępny/i })).toBeDisabled();
  });

  it("provides enrollment-focused page metadata", () => {
    expect(metadata.title).toBe("Zgłoszenie na zajęcia");
    expect(metadata.description).toMatch(/zapisz/i);
  });
});
