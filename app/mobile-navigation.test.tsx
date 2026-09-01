import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeSwitcher } from "./theme-switcher";

describe("MobileNavigation", () => {
  it("hides the articles link when no published articles are available", () => {
    render(<MobileNavigation hasArticles={false} />);

    const button = screen.getByRole("button", { name: "Menu" });
    const navigation = screen.getByRole("navigation", { hidden: true });

    fireEvent.click(button);

    expect(within(navigation).queryByRole("link", { name: "Artykuły" })).not.toBeInTheDocument();
  });

  it("keeps closed links inaccessible, opens them, and restores focus after Escape", () => {
    render(<MobileNavigation />);

    const button = screen.getByRole("button", { name: "Menu" });
    const navigation = screen.getByRole("navigation", { hidden: true });

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(navigation).toHaveAttribute("hidden");

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(navigation).not.toHaveAttribute("hidden");
    expect(within(navigation).getByRole("link", { name: "Kontakt" })).toHaveAttribute("href", "/kontakt");
    expect(within(navigation).getByRole("link", { name: "Zapisz się" })).toHaveAttribute("href", "/zgloszenie");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(navigation).toHaveAttribute("hidden");
    expect(button).toHaveFocus();
  });

  it("stays open after an inside click and closes after an outside click", () => {
    render(
      <>
        <MobileNavigation />
        <button type="button">Poza menu</button>
      </>,
    );

    const button = screen.getByRole("button", { name: "Menu" });
    const navigation = screen.getByRole("navigation", { hidden: true });

    fireEvent.click(button);
    fireEvent.pointerDown(screen.getByText("O mnie"));
    expect(navigation).not.toHaveAttribute("hidden");

    fireEvent.pointerDown(screen.getByRole("button", { name: "Poza menu" }));
    expect(navigation).toHaveAttribute("hidden");
  });
});

describe("ThemeSwitcher", () => {
  it("sets the signature variant from browser preference", () => {
    render(<ThemeSwitcher />);

    expect(document.documentElement.dataset.variant).toBe("signature");
  });

  it("renders nothing", () => {
    const { container } = render(<ThemeSwitcher />);

    expect(container).toBeEmptyDOMElement();
  });
});
