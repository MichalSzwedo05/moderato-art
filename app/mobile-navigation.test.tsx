import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeSwitcher } from "./theme-switcher";

describe("MobileNavigation", () => {
  it("keeps closed links inaccessible, opens them, and restores focus after Escape", () => {
    render(<MobileNavigation />);

    const button = screen.getByRole("button", { name: "Menu" });
    const navigation = screen.getByRole("navigation", { hidden: true });

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(navigation).toHaveAttribute("hidden");

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(navigation).not.toHaveAttribute("hidden");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(navigation).toHaveAttribute("hidden");
    expect(button).toHaveFocus();
  });

  it("closes when the appearance switcher opens", async () => {
    const user = userEvent.setup();

    render(
      <>
        <MobileNavigation />
        <ThemeSwitcher />
      </>,
    );

    const button = screen.getByRole("button", { name: "Menu" });
    const navigation = screen.getByRole("navigation", { hidden: true });

    fireEvent.click(button);
    expect(navigation).not.toHaveAttribute("hidden");

    await user.click(screen.getByText("Wygląd"));

    await waitFor(() => {
      expect(navigation).toHaveAttribute("hidden");
    });
  });

  it("closes the appearance switcher when mobile navigation opens", () => {
    const { container } = render(
      <>
        <MobileNavigation />
        <ThemeSwitcher />
      </>,
    );

    const details = container.querySelector("details");
    const button = screen.getByRole("button", { name: "Menu" });

    if (!details) {
      throw new Error("Theme switcher details element was not rendered.");
    }

    details.open = true;
    fireEvent.click(button);

    expect(details.open).toBe(false);
  });
});
