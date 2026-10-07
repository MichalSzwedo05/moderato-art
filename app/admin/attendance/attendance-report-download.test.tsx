import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceReportDownload } from "./attendance-report-download";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("AttendanceReportDownload", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  });

  it("shows the selected date range when there are no activities", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ dates: [], people: [] }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }));
    render(<AttendanceReportDownload
      groups={[{ id: "group-1", name: "Grupa A", submissionIds: ["submission-1"] }]}
      recipients={[{ childName: "Anna", email: "anna@example.com", id: "submission-1", parentName: null }]}
    />);

    fireEvent.change(screen.getByLabelText("Data od"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Data do"), { target: { value: "2026-09-07" } });
    fireEvent.click(screen.getByRole("button", { name: "Podgląd raportu" }));

    expect(await screen.findByText("Brak zajęć w podanym terminie (2026-09-01 – 2026-09-07)")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  });
});
