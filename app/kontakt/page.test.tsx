import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

import ContactPage, { metadata } from "./page";

describe("ContactPage", () => {
  it("renders contact details and a link to the enrollment page instead of a form", async () => {
    render(await ContactPage());

    expect(screen.getByRole("heading", { level: 1, name: /znajdźmy zajęcia/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /zapisać dziecko na zajęcia/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /przejdź do formularza zgłoszeniowego/i })).toHaveAttribute("href", "/zgloszenie");
    expect(screen.getByRole("link", { name: /wróć na stronę główną/i })).toHaveAttribute("href", "/");
    expect(screen.queryByLabelText(/rodzaj zajęć/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getByText("Magdalena Warzecha-Hiller", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "moderato.art@wp.pl" })).toHaveAttribute("href", "mailto:moderato.art@wp.pl");
    expect(screen.queryByText("6621786684", { selector: "dd" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "+48 605 946 678" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pokaż numer telefonu" }));
    expect(screen.getByRole("link", { name: "+48 605 946 678" })).toHaveAttribute("href", "tel:+48605946678");
  });

  it("provides focused page metadata for QR links", () => {
    expect(metadata.title).toBe("Kontakt");
    expect(metadata.description).toMatch(/zajęć muzycznych/i);
  });
});