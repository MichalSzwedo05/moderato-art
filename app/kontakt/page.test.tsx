import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
const { isContactFormConfigured } = vi.hoisted(() => ({ isContactFormConfigured: vi.fn() }));
vi.mock("../../lib/contact-config", () => ({ isContactFormConfigured }));

import ContactPage, { metadata } from "./page";

describe("ContactPage", () => {
  beforeEach(() => {
    isContactFormConfigured.mockReturnValue(true);
  });

  it("renders the standalone form and a link back to the home page", async () => {
    render(await ContactPage());

    expect(screen.getByRole("heading", { level: 1, name: /znajdźmy zajęcia/i })).toBeInTheDocument();
    expect(screen.getByRole("group")).not.toBeDisabled();
    expect(screen.getByLabelText("Rodzaj zajęć")).toBeRequired();
    expect(screen.getByRole("link", { name: /wróć na stronę główną/i })).toHaveAttribute("href", "/");
  });

  it("keeps the form disabled when production configuration is incomplete", async () => {
    isContactFormConfigured.mockReturnValue(false);

    render(await ContactPage());

    expect(screen.getByRole("group")).toBeDisabled();
    expect(screen.getByRole("button", { name: /formularz chwilowo niedostępny/i })).toBeDisabled();
  });

  it("provides focused page metadata for QR links", () => {
    expect(metadata.title).toBe("Kontakt");
    expect(metadata.description).toMatch(/zajęć muzycznych/i);
  });
});
