import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage, { metadata } from "./page";

describe("PrivacyPolicyPage", () => {
  it("shows the required sections, controller data, and home link", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole("heading", { level: 1, name: /polityka prywatności/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /1\. administrator danych/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /6\. retencja/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /wróć na stronę główną/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Przejdź do kontaktu" })).toHaveAttribute("href", "/kontakt");
    expect(screen.getByText("Magdalena Warzecha-Hiller")).toBeInTheDocument();
    expect(screen.getByText("moderato.art@wp.pl")).toBeInTheDocument();
    expect(screen.getByText(/imię i nazwisko osoby kontaktowej/i)).toBeInTheDocument();
    expect(screen.getByText(/opcjonalną treść wiadomości/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-30/)).toBeInTheDocument();
  });

  it("marks the published page as indexable", () => {
    expect(metadata.robots).toBeUndefined();
    expect(metadata.title).toBe("Polityka prywatności i zasady przetwarzania danych");
  });
});
