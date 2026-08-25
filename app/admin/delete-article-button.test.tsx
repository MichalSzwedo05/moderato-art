import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteArticleButton } from "./delete-article-button";
import { ArticleListStatus } from "./article-list-status";

const fetchMock = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("DeleteArticleButton", () => {
  it("requires confirmation, deletes the encoded article, and refreshes the page", async () => {
    render(<ArticleListStatus><DeleteArticleButton id="article id" title="Pierwszy artykuł" /></ArticleListStatus>);

    fireEvent.click(screen.getByRole("button", { name: "Usuń artykuł" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/articles/article%20id", { method: "DELETE" }));
    expect(window.confirm).toHaveBeenCalledWith("Czy na pewno trwale usunąć artykuł „Pierwszy artykuł”? Tej operacji nie można cofnąć. Możesz go najpierw zarchiwizować.");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Artykuł „Pierwszy artykuł” został usunięty.");
    expect(screen.getByRole("status")).toHaveFocus();
  });

  it("does not call the API when deletion is cancelled", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    render(<DeleteArticleButton id="article" title="Pierwszy artykuł" />);

    fireEvent.click(screen.getByRole("button", { name: "Usuń artykuł" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a generic server error", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Nie udało się usunąć artykułu." }), {
      headers: { "Content-Type": "application/json" },
      status: 503,
    }));
    render(<DeleteArticleButton id="article" title="Pierwszy artykuł" />);

    fireEvent.click(screen.getByRole("button", { name: "Usuń artykuł" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się usunąć artykułu."));
    expect(refresh).not.toHaveBeenCalled();
  });
});
