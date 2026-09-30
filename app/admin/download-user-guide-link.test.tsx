import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadUserGuideLink } from "./download-user-guide-link";

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

describe("DownloadUserGuideLink", () => {
  it("is a link that downloads the guide and announces success", async () => {
    render(<DownloadUserGuideLink />);

    const link = screen.getByRole("link", { name: "Pobierz instrukcję" });
    expect(link).toHaveAttribute("href", "/api/admin/user-guide");

    fireEvent.click(link);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/user-guide"));
    expect(await screen.findByRole("status")).toHaveTextContent("Instrukcja została pobrana.");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:guide");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Pobierz instrukcję" })).toBeInTheDocument();
  });

  it("keeps the dashboard and shows an error when download fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Brak dostępu." }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    }));
    render(<DownloadUserGuideLink />);

    fireEvent.click(screen.getByRole("link", { name: "Pobierz instrukcję" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Brak dostępu.");
    expect(screen.getByRole("link", { name: "Pobierz instrukcję" })).toBeInTheDocument();
  });

  it("lets the browser handle modified clicks", () => {
    render(<DownloadUserGuideLink />);

    fireEvent.click(screen.getByRole("link", { name: "Pobierz instrukcję" }), { ctrlKey: true });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
