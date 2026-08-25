import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleEditor } from "./article-editor";

describe("ArticleEditor", () => {
  it("creates a friendly slug and updates the live preview", () => {
    render(<ArticleEditor action={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Tytuł"), { target: { value: "Jak rozwijać głos dziecka?" } });
    fireEvent.change(screen.getByLabelText("Krótki opis"), { target: { value: "Prosty opis dla rodziców." } });
    fireEvent.change(screen.getByLabelText("Treść artykułu (Markdown)"), { target: { value: "## Pierwszy krok" } });

    expect(screen.getByLabelText("Adres artykułu")).toHaveValue("jak-rozwijac-glos-dziecka");
    expect(screen.getByRole("heading", { name: "Jak rozwijać głos dziecka?" })).toBeInTheDocument();
    expect(within(screen.getByLabelText("Podgląd artykułu")).getByText("Prosty opis dla rodziców.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pierwszy krok" })).toBeInTheDocument();
  });

  it("keeps archiving available alongside other article statuses", () => {
    render(<ArticleEditor action={vi.fn()} />);

    expect(screen.getByRole("option", { name: "Archiwum — ukryty na stronie" })).toHaveValue("ARCHIVED");
  });
});
