import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadUserGuideButton } from "./download-user-guide-button";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response("# Instrukcja CMS", { status: 200 }));
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:guide"), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("DownloadUserGuideButton", () => {
  it("downloads the guide and announces success", async () => {
    render(<DownloadUserGuideButton />);

    fireEvent.click(screen.getByRole("button", { name: "Pobierz instrukcję" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/user-guide", { method: "POST" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Instrukcja została pobrana.");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:guide");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pobierz instrukcję" })).toBeEnabled();
  });

  it("keeps the dashboard and shows an error when download fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Brak dostępu." }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    }));
    render(<DownloadUserGuideButton />);

    fireEvent.click(screen.getByRole("button", { name: "Pobierz instrukcję" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Brak dostępu.");
    expect(screen.getByRole("button", { name: "Pobierz instrukcję" })).toBeInTheDocument();
  });
});
