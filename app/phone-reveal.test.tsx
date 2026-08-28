import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhoneReveal } from "./phone-reveal";

describe("PhoneReveal", () => {
  it("keeps the phone number out of the initial markup and reveals it on request", () => {
    render(<PhoneReveal />);

    const button = screen.getByRole("button", { name: "Pokaż numer telefonu" });
    const reveal = button.closest(".phone-reveal")!;
    expect(screen.queryByRole("link", { name: "+48 605 946 678" })).not.toBeInTheDocument();
    expect(reveal.innerHTML).not.toContain("+48 605 946 678");
    expect(reveal.innerHTML).not.toContain("48605946678");
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);

    expect(screen.getByRole("link", { name: "+48 605 946 678" })).toHaveAttribute("href", "tel:+48605946678");
    expect(screen.getByRole("button", { name: "Ukryj numer telefonu" })).toHaveAttribute("aria-expanded", "true");
  });
});
