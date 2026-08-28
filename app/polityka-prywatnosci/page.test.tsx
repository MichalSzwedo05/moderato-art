import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage, { metadata } from "./page";

describe("PrivacyPolicyPage", () => {
  it("shows the draft notice, required sections, and home link", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole("heading", { level: 1, name: /polityka prywatności/i })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/wersja robocza/i);
    expect(screen.getByRole("heading", { name: /1\. administrator danych/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /6\. retencja/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /wróć na stronę główną/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Przejdź do kontaktu" })).toHaveAttribute("href", "/kontakt");
    expect(screen.getByText("[ADMINISTRATOR DANYCH – UZUPEŁNIĆ]")).toBeInTheDocument();
    expect(screen.getByText(/imię i nazwisko osoby kontaktowej/i)).toBeInTheDocument();
    expect(screen.getByText(/opcjonalną treść wiadomości/i)).toBeInTheDocument();
    expect(screen.getByText(/draft-optional-message-2026-08-25/)).toBeInTheDocument();
  });

  it("marks the draft page as non-indexable", () => {
    expect(metadata.robots).toEqual({ follow: false, index: false });
    expect(metadata.title).toBe("Polityka prywatności i zasady przetwarzania danych");
  });
});
