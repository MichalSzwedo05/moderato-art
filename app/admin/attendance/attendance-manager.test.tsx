import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

import { AttendanceManager } from "./attendance-manager";

const recipients = [
  { childName: "Anna", email: "anna@example.com", id: "submission-1", parentName: "Rodzic A", phone: null },
  { childName: "Jan", email: "jan@example.com", id: "submission-2", parentName: "Rodzic B", phone: null },
  { childName: "Ola", email: "ola@example.com", id: "submission-3", parentName: "Rodzic C", phone: null },
];
const groups = [
  { id: "group-1", name: "Grupa A", submissionIds: ["submission-1", "submission-2"] },
  { id: "group-2", name: "Grupa B", submissionIds: ["submission-2", "submission-3"] },
];
const activities = [{
  activityDate: "2026-10-01T00:00:00.000Z",
  endsAt: "2026-10-01T17:00:00.000Z",
  groupId: "group-1",
  id: "activity-1",
  name: "Lekcja 1",
  participants: [{ present: true, submissionId: "submission-1" }, { present: false, submissionId: "submission-2" }],
  startsAt: "2026-10-01T16:00:00.000Z",
}];

describe("AttendanceManager activity form", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("defaults to selecting an activity and fills editable fields", () => {
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    expect(screen.getByRole("heading", { name: "Wybierz zajęcia" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Wybierz zajęcia"), { target: { value: "activity-1" } });

    const details = document.querySelector(".attendance-selected-details");
    expect(details).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("Lekcja 1")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("2026-10-01 · 16:00–17:00")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("Grupa A")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Lista obecności" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nazwa zajęć")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    expect(screen.getByLabelText("Nazwa zajęć")).toHaveValue("Lekcja 1");
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("Od")).toHaveValue("16:00");
    expect(screen.getByLabelText("Do")).toHaveValue("17:00");
    expect(screen.getByLabelText("Wybierz grupę")).toHaveValue("group-1");
    expect(screen.queryByRole("heading", { name: "Lekcja 1" })).not.toBeInTheDocument();
  });

  it("filters activities by date, group, and start time", () => {
    const secondActivity = {
      ...activities[0],
      activityDate: "2026-10-02T00:00:00.000Z",
      groupId: "group-2",
      id: "activity-2",
      name: "Lekcja 2",
      startsAt: "2026-10-02T18:00:00.000Z",
    };
    render(<AttendanceManager activities={[activities[0], secondActivity]} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "Filtruj" }));
    fireEvent.change(screen.getByLabelText("Data zajęć od"), { target: { value: "2026-10-02" } });
    fireEvent.change(screen.getByLabelText("Data zajęć do"), { target: { value: "2026-10-02" } });
    fireEvent.change(screen.getByLabelText("Grupa zajęć"), { target: { value: "group-2" } });
    fireEvent.change(screen.getByLabelText("Godzina zajęć od"), { target: { value: "17:00" } });
    fireEvent.change(screen.getByLabelText("Godzina zajęć do"), { target: { value: "19:00" } });

    expect(screen.getByText("Znaleziono: 1 zajęcia")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Lekcja 2/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Lekcja 1/ })).not.toBeInTheDocument();
  });

  it("shows an empty selector state and clears filters", () => {
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "Filtruj" }));
    fireEvent.change(screen.getByLabelText("Data zajęć od"), { target: { value: "2026-11-01" } });

    expect(screen.getByRole("option", { name: "Brak zajęć spełniających filtry" })).toBeInTheDocument();
    expect(screen.getByText("Znaleziono: 0 zajęć")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Wyczyść filtry" }));
    expect(screen.getByText("Znaleziono: 1 zajęcia")).toBeInTheDocument();
  });

  it("keeps filters collapsed until requested", () => {
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    expect(screen.getByRole("button", { name: "Filtruj" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Data zajęć od")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filtruj" }));
    expect(screen.getByRole("button", { name: "Filtruj" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Data zajęć od")).toBeInTheDocument();
  });

  it("moves through activities with the previous and next buttons", () => {
    const laterActivity = { ...activities[0], activityDate: "2026-10-02T00:00:00.000Z", id: "activity-2", name: "Lekcja 2" };
    render(<AttendanceManager activities={[activities[0], laterActivity]} groups={groups} recipients={recipients} selectedDate="2026-10-01" />);

    expect(screen.getByRole("button", { name: "Poprzedni dzień z zajęciami" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Następny dzień z zajęciami" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Następny dzień z zajęciami" }));

    expect(screen.getByText("2026-10-02 · 16:00–17:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Następny dzień z zajęciami" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Poprzedni dzień z zajęciami" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Poprzedni dzień z zajęciami" }));
    expect(screen.getByText("2026-10-01 · 16:00–17:00")).toBeInTheDocument();
  });

  it("shows every activity from the selected day", () => {
    const secondActivity = { ...activities[0], id: "activity-2", name: "Lekcja 2", startsAt: "2026-10-01T18:00:00.000Z" };
    render(<AttendanceManager activities={[activities[0], secondActivity]} groups={groups} recipients={recipients} selectedDate="2026-10-01" />);

    expect(screen.getByText("2026-10-01 (cz)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wybierz Lekcja 1, 2026-10-01 16:00, Grupa A" })).toHaveClass("attendance-nearest-activity-active");
    expect(screen.getByRole("button", { name: "Wybierz Lekcja 1, 2026-10-01 16:00, Grupa A" })).toHaveTextContent("16:00Grupa A");
    expect(screen.getByRole("button", { name: "Wybierz Lekcja 2, 2026-10-01 18:00, Grupa A" })).not.toHaveClass("attendance-nearest-activity-active");
    expect(screen.getByRole("button", { name: "Wybierz Lekcja 2, 2026-10-01 18:00, Grupa A" })).toHaveTextContent("18:00Grupa A");
    expect(screen.getByRole("button", { name: "Poprzedni dzień z zajęciami" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Następny dzień z zajęciami" })).toBeDisabled();
  });

  it("defaults to the activity closest to the requested date", () => {
    const laterActivity = { ...activities[0], activityDate: "2026-10-10T00:00:00.000Z", id: "activity-2", name: "Lekcja 2" };
    render(<AttendanceManager activities={[activities[0], laterActivity]} groups={groups} recipients={recipients} selectedDate="2026-10-09" />);

    expect(screen.getByLabelText("Wybierz zajęcia")).toHaveValue("activity-2");
    expect(screen.getByText("Lekcja 2")).toBeInTheDocument();
  });

  it("defaults to the activity closest to the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T16:30:00.000Z"));
    const activitiesNearCurrentTime = [
      { ...activities[0], activityDate: "2026-10-05T00:00:00.000Z", id: "activity-before", name: "Wcześniejsze zajęcia", startsAt: "2026-10-05T16:00:00.000Z" },
      { ...activities[0], activityDate: "2026-10-05T00:00:00.000Z", id: "activity-after", name: "Późniejsze zajęcia", startsAt: "2026-10-05T18:00:00.000Z" },
    ];
    render(<AttendanceManager activities={activitiesNearCurrentTime} groups={groups} recipients={recipients} />);

    expect(screen.getByLabelText("Wybierz zajęcia")).toHaveValue("activity-before");
    vi.useRealTimers();
  });

  it("selects the closest activity when returning to activity selection", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T16:30:00.000Z"));
    const activitiesNearCurrentTime = [
      { ...activities[0], activityDate: "2026-10-05T00:00:00.000Z", id: "activity-before", name: "Wcześniejsze zajęcia", startsAt: "2026-10-05T16:00:00.000Z" },
      { ...activities[0], activityDate: "2026-10-05T00:00:00.000Z", id: "activity-after", name: "Późniejsze zajęcia", startsAt: "2026-10-05T18:00:00.000Z" },
    ];
    render(<AttendanceManager activities={activitiesNearCurrentTime} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Nowe zajęcia" }));
    fireEvent.click(screen.getByRole("button", { name: "Wybierz zajęcia" }));

    expect(screen.getByLabelText("Wybierz zajęcia")).toHaveValue("activity-before");
    vi.useRealTimers();
  });

  it("recovers the assigned group for legacy activities with an extra participant", () => {
    const legacyActivity = { ...activities[0], groupId: null, participants: [...activities[0].participants, { present: false, submissionId: "submission-3" }] };
    render(<AttendanceManager activities={[legacyActivity]} groups={groups} recipients={recipients} selectedActivityId="activity-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    expect(screen.getByLabelText("Wybierz grupę")).toHaveValue("group-1");
    expect(screen.getByRole("button", { name: "Oznacz Ola jako obecnego" })).toBeInTheDocument();
  });

  it("updates the selected activity after editing populated fields", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ id: "activity-1" }), ok: true });
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.change(screen.getByLabelText("Wybierz zajęcia"), { target: { value: "activity-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    fireEvent.change(screen.getByLabelText("Nazwa zajęć"), { target: { value: "Lekcja zmieniona" } });
    fireEvent.change(screen.getByLabelText("Od"), { target: { value: "17:00" } });
    fireEvent.change(screen.getByLabelText("Do"), { target: { value: "18:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Oznacz Jan jako obecnego" }));
    expect(screen.queryByRole("heading", { name: "Lekcja 1" })).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.submit(screen.getByRole("heading", { name: "Wybierz zajęcia" }).closest("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Uczestnicy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oznacz Jan jako nieobecnego" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edytuj" })).toBeInTheDocument();
    expect(screen.getByText("Lekcja zmieniona")).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/admin/attendance/activity-1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(String(options.body))).toEqual({
      activityDate: "2026-10-01",
      endsAt: "18:00",
      groupId: "group-1",
      groupIds: ["group-1"],
      name: "Lekcja zmieniona",
      participants: [{ present: true, submissionId: "submission-1" }, { present: true, submissionId: "submission-2" }],
      startsAt: "17:00",
    });
  });

  it("adds a person outside the assigned group to the attendance list", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ id: "activity-1" }), ok: true });
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "Dodaj uczestnika spoza grupy" }));
    expect(screen.getByRole("option", { name: "Ola · ola@example.com" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("listbox", { name: "Dostępni uczestnicy spoza grupy" }), { target: { value: "submission-3" } });
    expect(screen.getByRole("button", { name: "Oznacz Ola jako obecnego" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Oznacz Ola jako obecnego" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.participants).toContainEqual({ present: true, submissionId: "submission-3" });
  });

  it("combines members from multiple groups without duplicates", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ id: "activity-2" }), ok: true });
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Nowe zajęcia" }));
    fireEvent.change(screen.getByLabelText("Wybierz grupę"), { target: { value: "group-1" } });
    fireEvent.change(screen.getByLabelText("Wybierz grupę"), { target: { value: "group-2" } });

    expect(screen.getByText("Uczestnicy").parentElement).toHaveTextContent("3");
    expect(screen.getAllByText("Jan")).toHaveLength(1);
    expect(screen.getByText("Ola")).toBeInTheDocument();
  });

  it("shows confirm on the left and delete on the right for selected activities", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.change(screen.getByLabelText("Wybierz zajęcia"), { target: { value: "activity-1" } });

    const actions = screen.getByRole("heading", { name: "Wybierz zajęcia" }).closest("form")?.querySelector(".attendance-selected-actions");
    expect(actions?.querySelector(".attendance-selected-actions-left")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    expect(screen.queryByRole("button", { name: "Zatwierdź zmiany" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nazwa zajęć"), { target: { value: "Zmieniona nazwa" } });
    const saveButton = screen.getByRole("button", { name: "Zatwierdź zmiany" });
    expect(saveButton.closest(".attendance-selected-groups")).toBeInTheDocument();
    expect(actions?.querySelector(".attendance-selected-actions-right")?.querySelector("button")).toHaveTextContent("Usuń zajęcia");
    const deleteButton = within(actions as HTMLElement).getByRole("button", { name: "Usuń zajęcia" });
    expect(deleteButton).toHaveClass("admin-destructive-button");

    fireEvent.click(deleteButton);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/attendance/activity-1", { method: "DELETE" }));
  });

  it("offers a new activity mode beside the selector", () => {
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Nowe zajęcia" }));

    expect(screen.getByRole("heading", { name: "Nowe zajęcia" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Wybierz zajęcia")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wybierz zajęcia" })).toBeInTheDocument();
  });

  it("resets the new activity date instead of reusing the selected activity date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00.000Z"));
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Nowe zajęcia" }));

    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-05");
    vi.useRealTimers();
  });

  it("sends the selected weekly repeat count for new activities", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ id: "activity-2" }), ok: true });
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Nowe zajęcia" }));
    fireEvent.change(screen.getByLabelText("Nazwa zajęć"), { target: { value: "Lekcja cykliczna" } });
    fireEvent.change(screen.getByLabelText("Wybierz grupę"), { target: { value: "group-1" } });
    fireEvent.click(screen.getByRole("radio", { name: "Co tydzień przez" }));
    fireEvent.change(screen.getByLabelText("tygodni"), { target: { value: "3" } });
    fireEvent.submit(screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.repeatWeeks).toBe(3);
  });

  it("shows a prominent success message and link to the created activity", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ id: "activity-2" }), ok: true });
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Nowe zajęcia" }));
    fireEvent.change(screen.getByLabelText("Nazwa zajęć"), { target: { value: "Nowe zajęcia" } });
    fireEvent.change(screen.getByLabelText("Wybierz grupę"), { target: { value: "group-1" } });
    fireEvent.submit(screen.getByRole("heading", { name: "Nowe zajęcia" }).closest("form")!);

    expect(await screen.findByRole("status")).toHaveTextContent("Zajęcia zostały utworzone pomyślnie");
    expect(screen.getByRole("link", { name: "Wybierz zajęcia: Nowe zajęcia" })).toHaveAttribute("href", "#attendance-create-form");
  });
});
