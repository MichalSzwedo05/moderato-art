import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./change-password-form";

const fetchMock = vi.fn();

function submit(values: Record<string, string>) {
  render(<ChangePasswordForm />);
  fireEvent.change(screen.getByLabelText("Obecne hasło"), { target: { value: values.currentPassword } });
  fireEvent.change(screen.getByLabelText("Nowe hasło"), { target: { value: values.newPassword } });
  fireEvent.change(screen.getByLabelText("Powtórz nowe hasło"), { target: { value: values.confirmPassword } });
  fireEvent.click(screen.getByRole("button", { name: "Zmień hasło" }));
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("submits the three fields to the change-password route", async () => {
    submit({ currentPassword: "correct", newPassword: "new-password-123", confirmPassword: "new-password-123" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/admin/auth/change-password");
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body);
    expect(body.get("currentPassword")).toBe("correct");
    expect(body.get("newPassword")).toBe("new-password-123");
    expect(body.get("confirmPassword")).toBe("new-password-123");
  });

  it("navigates to the redirect on a successful change", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { writable: true, value: { ...window.location, assign } });
    fetchMock.mockResolvedValue({ redirected: true, url: "/admin/password?password=changed" } as unknown as Response);

    submit({ currentPassword: "correct", newPassword: "new-password-123", confirmPassword: "new-password-123" });

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/admin/password?password=changed"));
  });

  it("shows an error when the current password is incorrect", async () => {
    fetchMock.mockResolvedValue(new Response("Invalid current password", { status: 403 }));
    submit({ currentPassword: "wrong", newPassword: "new-password-123", confirmPassword: "new-password-123" });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Obecne hasło jest niepoprawne."));
  });
});
