import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteSubmissionButton } from "./delete-submission-button";

const fetchMock = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  vi.spyOn(window, "dispatchEvent");
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("DeleteSubmissionButton", () => {
  it("requires confirmation, deletes the encoded record, and refreshes the page", async () => {
    render(<DeleteSubmissionButton id="submission" parentName="Anna Kowalska" />);

    fireEvent.click(screen.getByRole("button", { name: "Usuń zgłoszenie" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/submissions/submission", { method: "DELETE" }));
    expect(window.confirm).toHaveBeenCalledWith("Czy na pewno usunąć zgłoszenie od „Anna Kowalska”? Tej operacji nie można cofnąć.");
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "admin-contact-submission-deleted" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not call the API when deletion is cancelled", () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    render(<DeleteSubmissionButton id="submission" parentName="Anna Kowalska" />);

    fireEvent.click(screen.getByRole("button", { name: "Usuń zgłoszenie" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a generic server error", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Nie udało się usunąć zgłoszenia." }), {
      headers: { "Content-Type": "application/json" },
      status: 503,
    }));
    render(<DeleteSubmissionButton id="submission" parentName="Anna Kowalska" />);

    fireEvent.click(screen.getByRole("button", { name: "Usuń zgłoszenie" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się usunąć zgłoszenia."));
    expect(refresh).not.toHaveBeenCalled();
  });
});
