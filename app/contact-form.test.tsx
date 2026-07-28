import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactForm } from "./contact-form";

describe("ContactForm", () => {
  it("keeps every staged control disabled and explains why the form is unavailable", () => {
    render(<ContactForm />);

    expect(screen.getByRole("group")).toBeDisabled();
    expect(screen.getByText(/formularz zostanie aktywowany/i)).toBeInTheDocument();
  });
});
