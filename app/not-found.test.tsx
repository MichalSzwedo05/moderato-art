import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));

import NotFound from "./not-found";

describe("NotFound", () => {
  it("offers a contact link", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Przejdź do kontaktu" })).toHaveAttribute("href", "/kontakt");
  });
});
