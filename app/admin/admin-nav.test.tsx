import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNav } from "./admin-nav";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/email",
  useRouter: () => ({ push }),
}));

describe("AdminNav", () => {
  beforeEach(() => push.mockReset());

  it("keeps the current page selected in the compact navigation", () => {
    render(<AdminNav />);

    expect(screen.getByRole("combobox", { name: "Nawigacja panelu administracyjnego" })).toHaveValue("/admin/email");
    expect(screen.getByRole("option", { name: "E-mail" })).toBeInTheDocument();
  });

  it("navigates when another mobile destination is selected", () => {
    render(<AdminNav />);

    fireEvent.change(screen.getByRole("combobox", { name: "Nawigacja panelu administracyjnego" }), { target: { value: "/admin/attendance" } });

    expect(push).toHaveBeenCalledWith("/admin/attendance");
  });
});
