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
    groupId: "group-1",
    id: "activity-1",
    name: "Lekcja 1",
    participants: [{ childName: "Anna", id: "submission-1", parentName: "Rodzic A", present: true }, { childName: "Jan", id: "submission-2", parentName: "Rodzic B", present: false }],
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
    expect(screen.getByRole("button", { name: /Dodaj zajęcia poniedziałek, 21 września 2026 o 16:00/ })).toBeInTheDocument();
  });

  it("shows the default calendar range from 09:00 to 19:00", () => {
    renderBoard();

    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("19:00")).toBeInTheDocument();
    expect(screen.queryByText("08:00")).not.toBeInTheDocument();
    expect(screen.queryByText("20:00")).not.toBeInTheDocument();
  });

  it("extends the visible range for early and late activities", () => {
    renderBoard([
      activity({ endsAt: "2026-09-23T08:30:00.000Z", startsAt: "2026-09-23T07:30:00.000Z" }),
      activity({ endsAt: "2026-09-23T21:15:00.000Z", id: "activity-2", startsAt: "2026-09-23T20:30:00.000Z" }),
    ]);

    expect(screen.getByText("07:00")).toBeInTheDocument();
    expect(screen.getByText("21:00")).toBeInTheDocument();
    expect(screen.queryByText("06:00")).not.toBeInTheDocument();
    expect(screen.queryByText("22:00")).not.toBeInTheDocument();
  });

  it("starts and ends the visible range at the attendance hours", () => {
    renderBoard([activity({ endsAt: "2026-09-23T13:45:00.000Z", startsAt: "2026-09-23T11:15:00.000Z" })]);

    expect(screen.getByText("11:00")).toBeInTheDocument();
    expect(screen.getByText("13:00")).toBeInTheDocument();
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
    expect(screen.queryByText("14:00")).not.toBeInTheDocument();
  });

  it("recalculates the range when refreshed events change", () => {
    const view = renderBoard();

    expect(screen.queryByText("20:00")).not.toBeInTheDocument();
    view.rerender(<CalendarBoard activities={[activity({ endsAt: "2026-09-23T21:15:00.000Z", startsAt: "2026-09-23T20:30:00.000Z" })]} currentDate={currentDate} groups={groups} weekStart={weekStart} />);
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByText("21:00")).toBeInTheDocument();

    view.rerender(<CalendarBoard activities={[]} currentDate={currentDate} groups={groups} weekStart={weekStart} />);
    expect(screen.queryByText("20:00")).not.toBeInTheDocument();
    expect(screen.getByText("19:00")).toBeInTheDocument();
  });

  it("keeps the full title visible for a short activity block", () => {
    renderBoard([activity({ name: "Długie zajęcia indywidualne" })]);

    const block = screen.getByRole("button", { name: "Długie zajęcia indywidualne, 16:00–17:00, 2 osób" });
    expect(block).toHaveClass("admin-calendar-block-compact");
    expect(block.querySelector("strong")).toHaveTextContent("Długie zajęcia indywidualne");
    expect(block.querySelector("span")).toHaveTextContent("16:00–17:00");
  });

  it("places overlapping activities into separate horizontal lanes", () => {
    const overlappingActivities = [
      activity({ id: "activity-1", name: "Lekcja A" }),
      activity({ id: "activity-2", name: "Lekcja B" }),
      activity({ id: "activity-3", name: "Lekcja C" }),
    ];
    renderBoard(overlappingActivities);

    const blocks = [...document.querySelectorAll<HTMLButtonElement>(".admin-calendar-block")];
    expect(blocks).toHaveLength(3);
    expect(new Set(blocks.map((block) => block.style.left)).size).toBe(3);
    expect(blocks.every((block) => block.style.width === "calc(33.3333% - 4px)")).toBe(true);
    expect(blocks.every((block) => block.classList.contains("admin-calendar-block-laned"))).toBe(true);
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

  it("places save before cancel in the create action row", () => {
    renderBoard();

    openCreateDialog();
    const actions = screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")?.querySelector(".admin-calendar-create-actions");
    expect(actions?.querySelectorAll("button")[0]).toHaveTextContent("Zapisz zajęcia");
    expect(actions?.querySelectorAll("button")[1]).toHaveTextContent("Anuluj");
  });

  it("shows the missing group beside the save button instead of silently doing nothing", () => {
    renderBoard();

    openCreateDialog();
    fireEvent.submit(screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")!);

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Uzupełnij lub popraw zaznaczone pola");
    expect(screen.getByRole("combobox", { name: /Grupa/ })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Wybierz grupę uczestników.")).toBeInTheDocument();
  });

  it("highlights an invalid time range", () => {
    renderBoard();

    openCreateDialog();
    fireEvent.change(screen.getByLabelText("Od"), { target: { value: "18:00" } });
    fireEvent.change(screen.getByLabelText("Do"), { target: { value: "17:00" } });
    fireEvent.change(screen.getByLabelText("Grupa"), { target: { value: "group-1" } });
    fireEvent.submit(screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")!);

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(document.getElementById("calendar-create-endsAt")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Godzina zakończenia musi być późniejsza niż rozpoczęcia.")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Nazwa zajęć")).toHaveAttribute("readonly");
    fireEvent.click(screen.getByLabelText("Nazwa zajęć"));
    expect(screen.getByLabelText("Nazwa zajęć")).not.toHaveAttribute("readonly");
    expect(screen.getByText("Pianino grupa A")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lista obecności" })).toHaveTextContent("Anna");
    expect(screen.getByRole("region", { name: "Lista obecności" })).toHaveTextContent("Obecny");
    expect(screen.getByRole("region", { name: "Lista obecności" })).toHaveTextContent("Jan");
    expect(screen.getByRole("region", { name: "Lista obecności" })).toHaveTextContent("Nieobecny");
    expect(screen.getByRole("button", { name: "Zatwierdź" })).toBeInTheDocument();
    expect(document.querySelectorAll(".admin-modal-actions-group")).toHaveLength(2);
  });

  it("deletes a whole repeat series on request", async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ deleted: 3 }), ok: true });
    renderBoard([activity({ seriesId: "series-1" })]);

    fireEvent.click(screen.getByRole("button", { name: "Lekcja 1, 16:00–17:00, 2 osób" }));
    fireEvent.change(screen.getByLabelText("Usuń"), { target: { value: "series" } });
    const deleteButton = screen.getByRole("button", { name: "Usuń" });
    fireEvent.click(deleteButton);

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    expect(deleteButton).toHaveClass("admin-destructive-button");
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
    fireEvent.click(screen.getByRole("button", { name: "Zatwierdź" }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/attendance/activity-1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(String(options.body))).toEqual({ activityDate: "2026-09-23", endsAt: "17:00", groupId: "group-1", name: "Lekcja 1 poprawiona", startsAt: "16:00" });
  });

  it("recalculates the range after updating and deleting an activity", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ json: async () => ({ id: "activity-1" }), ok: true })
      .mockResolvedValueOnce({ json: async () => ({ deleted: 1 }), ok: true });
    renderBoard([activity()]);

    expect(screen.queryByText("20:00")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lekcja 1, 16:00–17:00, 2 osób" }));
    fireEvent.change(screen.getByLabelText("Od"), { target: { value: "20:00" } });
    fireEvent.change(screen.getByLabelText("Do"), { target: { value: "21:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Zatwierdź" }));

    await waitFor(() => expect(screen.getByText("20:00")).toBeInTheDocument());
    expect(screen.queryByText("21:00")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lekcja 1, 20:00–21:00, 2 osób" }));
    fireEvent.click(screen.getByRole("button", { name: "Usuń" }));

    await waitFor(() => expect(screen.queryByText("20:00")).not.toBeInTheDocument());
    expect(screen.getByText("19:00")).toBeInTheDocument();
  });

  it("surfaces an error when creation is rejected", async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ message: "Aktywność o tej nazwie i dacie już istnieje." }), ok: false });
    renderBoard();

    openCreateDialog();
    fireEvent.change(screen.getByLabelText("Grupa"), { target: { value: "group-1" } });
    fireEvent.submit(screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")!);

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Aktywność o tej nazwie i dacie już istnieje.").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: /Nazwa zajęć/ })).toHaveAttribute("aria-invalid", "true");
  });
});
