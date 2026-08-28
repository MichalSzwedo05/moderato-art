import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("next/navigation", () => ({ usePathname }));

import ErrorPage from "./error";

describe("ErrorPage", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  it("offers a contact link for errors outside the contact page", () => {
    render(<ErrorPage reset={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Skontaktuj się z nami" })).toHaveAttribute("href", "/kontakt");
  });

  it("offers a home link instead of linking back to the failing contact page", () => {
    usePathname.mockReturnValue("/kontakt");

    render(<ErrorPage reset={vi.fn()} />);

    expect(screen.queryByRole("link", { name: "Skontaktuj się z nami" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wróć na stronę główną" })).toHaveAttribute("href", "/");
  });

  it("offers a home link for admin errors", () => {
    usePathname.mockReturnValue("/admin/submissions");

    render(<ErrorPage reset={vi.fn()} />);

    expect(screen.queryByRole("link", { name: "Skontaktuj się z nami" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wróć na stronę główną" })).toHaveAttribute("href", "/");
  });

  it("handles the trailing slash on the contact page", () => {
    usePathname.mockReturnValue("/kontakt/");

    render(<ErrorPage reset={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Wróć na stronę główną" })).toHaveAttribute("href", "/");
  });
});
