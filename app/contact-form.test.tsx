import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactForm } from "./contact-form";

describe("ContactForm", () => {
  it("keeps every staged control disabled and explains why the form is unavailable", () => {
    render(<ContactForm />);

    expect(screen.getByRole("group")).toBeDisabled();
    expect(screen.getByText(/formularz zostanie aktywowany/i)).toBeInTheDocument();
  });

  it("shows a visible synthetic-data warning when the restricted test mode is enabled", () => {
    render(<ContactForm testEnabled />);

    expect(screen.getByRole("group")).not.toBeDisabled();
    expect(screen.getByText(/używaj wyłącznie fikcyjnych danych/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kod dostępu do testu/i)).toHaveAttribute("type", "password");
  });
});
