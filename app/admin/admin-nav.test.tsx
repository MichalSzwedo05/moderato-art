import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNav, getWhatsAppUrl } from "./admin-nav";

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

  it("offers WhatsApp navigation", () => {
    render(<AdminNav />);

    expect(screen.getByRole("option", { name: "WhatsApp" })).toBeInTheDocument();
  });

  it("uses WhatsApp Web on localhost and the app link on mobile", () => {
    expect(getWhatsAppUrl(false, true)).toBe("https://web.whatsapp.com/send?phone=48605946678");
    expect(getWhatsAppUrl(true, true)).toBe("https://web.whatsapp.com/send?phone=48605946678");
    expect(getWhatsAppUrl(true, false)).toBe("https://wa.me/48605946678");
  });
});
