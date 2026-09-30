import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import { CalendarBoard, type CalendarBoardActivity } from "./calendar-board";

const groups = [{ id: "group-1", name: "Pianino grupa A", submissionIds: ["submission-1", "submission-2"] }];
const currentDate = "2026-09-23";
const weekStart = "2026-09-21";

function activity(overrides: Partial<CalendarBoardActivity> = {}): CalendarBoardActivity {
  return {
    activityDate: "2026-09-23T00:00:00.000Z",
    endsAt: "2026-09-23T17:00:00.000Z",
    id: "activity-1",
    name: "Lekcja 1",
    presentCount: 0,
    seriesId: null,
    startsAt: "2026-09-23T16:00:00.000Z",
    totalParticipants: 2,
    ...overrides,
  };
}

function renderBoard(activities: CalendarBoardActivity[] = []) {
  return render(<CalendarBoard activities={activities} currentDate={currentDate} groups={groups} weekStart={weekStart} />);
}

function openCreateDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Dodaj zajęcia środa, 23 września 2026 o 16:00" }));
  return screen.getByRole("heading", { name: "Nowe zajęcia" });
}

describe("CalendarBoard", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  });

  beforeEach(() => {
    mocks.fetch.mockReset();
    mocks.refresh.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  it("renders a week of days with hour slots and existing activities", () => {
    renderBoard([activity()]);

    expect(screen.getByText("Poniedziałek")).toBeInTheDocument();
    expect(screen.getByText("Niedziela")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lekcja 1, 16:00–17:00, 2 osób" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dodaj zajęcia poniedziałek, 21 września 2026 o 09:00/ })).toBeInTheDocument();
  });

  it("creates a one-off activity with the participants of the selected group", async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ id: "activity-2", skippedDates: [] }), ok: true });
    renderBoard();

    openCreateDialog();
    fireEvent.change(screen.getByLabelText("Nazwa zajęć"), { target: { value: "Lekcja 2" } });
    fireEvent.change(screen.getByLabelText("Grupa"), { target: { value: "group-1" } });
    fireEvent.submit(screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")!);

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/attendance");
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({
      activityDate: "2026-09-23",
      endsAt: "17:00",
      name: "Lekcja 2",
      participants: [{ present: false, submissionId: "submission-1" }, { present: false, submissionId: "submission-2" }],
      repeatWeeks: 1,
      startsAt: "16:00",
    });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("creates a weekly series and reports dates skipped as duplicates", async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ id: "activity-2", skippedDates: ["2026-09-30"] }), ok: true });
    renderBoard([activity()]);

    openCreateDialog();
    fireEvent.change(screen.getByLabelText("Grupa"), { target: { value: "group-1" } });
    fireEvent.click(screen.getByRole("radio", { name: "Co tydzień przez" }));
    fireEvent.change(screen.getByLabelText("tygodni"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz zajęcia" }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String((mocks.fetch.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.repeatWeeks).toBe(3);
    expect(body.name).toBe("Lekcja 2");
    await waitFor(() => expect(screen.getAllByText(/Pominięto daty z istniejącą już aktywnością: 2026-09-30/).length).toBeGreaterThan(0));
  });

  it("opens an existing activity with a link to attendance and no delete scope for one-offs", () => {
    renderBoard([activity()]);

    fireEvent.click(screen.getByRole("button", { name: "Lekcja 1, 16:00–17:00, 2 osób" }));

    expect(screen.getByRole("link", { name: "Obecność" })).toHaveAttribute("href", "/admin/attendance?date=2026-09-23&activity=activity-1");
    expect(screen.queryByRole("combobox", { name: "Usuń" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Od")).toHaveValue("16:00");
    expect(screen.getByLabelText("Do")).toHaveValue("17:00");
  });

  it("deletes a whole repeat series on request", async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ deleted: 3 }), ok: true });
    renderBoard([activity({ seriesId: "series-1" })]);

    fireEvent.click(screen.getByRole("button", { name: "Lekcja 1, 16:00–17:00, 2 osób" }));
    fireEvent.change(screen.getByLabelText("Usuń"), { target: { value: "series" } });
    fireEvent.click(screen.getByRole("button", { name: "Usuń" }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/attendance/activity-1?scope=series");
    expect(options.method).toBe("DELETE");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("renames an activity in place", async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ id: "activity-1" }), ok: true });
    renderBoard([activity()]);

    fireEvent.click(screen.getByRole("button", { name: "Lekcja 1, 16:00–17:00, 2 osób" }));
    fireEvent.change(screen.getByLabelText("Nazwa zajęć"), { target: { value: "Lekcja 1 poprawiona" } });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/attendance/activity-1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(String(options.body))).toEqual({ activityDate: "2026-09-23", endsAt: "17:00", name: "Lekcja 1 poprawiona", startsAt: "16:00" });
  });

  it("surfaces an error when creation is rejected", async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ message: "Aktywność o tej nazwie i dacie już istnieje." }), ok: false });
    renderBoard();

    openCreateDialog();
    fireEvent.change(screen.getByLabelText("Grupa"), { target: { value: "group-1" } });
    fireEvent.submit(screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")!);

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Aktywność o tej nazwie i dacie już istnieje.").length).toBeGreaterThan(0);
  });
});