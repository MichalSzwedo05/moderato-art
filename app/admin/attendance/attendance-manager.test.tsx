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
const groups = [{ id: "group-1", name: "Grupa A", submissionIds: ["submission-1", "submission-2"] }];
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

  it("defaults to the activity closest to the requested date", () => {
    const laterActivity = { ...activities[0], activityDate: "2026-10-10T00:00:00.000Z", id: "activity-2", name: "Lekcja 2" };
    render(<AttendanceManager activities={[activities[0], laterActivity]} groups={groups} recipients={recipients} selectedDate="2026-10-09" />);

    expect(screen.getByLabelText("Wybierz zajęcia")).toHaveValue("activity-2");
    expect(screen.getByText("Lekcja 2")).toBeInTheDocument();
  });

  it("recovers the assigned group for legacy activities with an extra participant", () => {
    const legacyActivity = { ...activities[0], groupId: null, participants: [...activities[0].participants, { present: false, submissionId: "submission-3" }] };
    render(<AttendanceManager activities={[legacyActivity]} groups={groups} recipients={recipients} selectedActivityId="activity-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    expect(screen.getByLabelText("Wybierz grupę")).toHaveValue("group-1");
    expect(screen.getByRole("button", { name: "Oznacz Ola jako obecnego" })).toBeInTheDocument();
  });

  it("updates the selected activity after editing populated fields", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ id: "activity-1" }), ok: true });
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.change(screen.getByLabelText("Wybierz zajęcia"), { target: { value: "activity-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Edytuj" }));
    fireEvent.change(screen.getByLabelText("Nazwa zajęć"), { target: { value: "Lekcja zmieniona" } });
    fireEvent.change(screen.getByLabelText("Od"), { target: { value: "17:00" } });
    fireEvent.change(screen.getByLabelText("Do"), { target: { value: "18:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Oznacz Jan jako obecnego" }));
    expect(screen.queryByRole("heading", { name: "Lekcja 1" })).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole("heading", { name: "Wybierz zajęcia" }).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Uczestnicy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oznacz Jan jako nieobecnego" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edytuj" })).toBeInTheDocument();
    expect(screen.getByText("Lekcja zmieniona")).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/attendance/activity-1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(String(options.body))).toEqual({
      activityDate: "2026-10-01",
      endsAt: "18:00",
      groupId: "group-1",
      name: "Lekcja zmieniona",
      participants: [{ present: true, submissionId: "submission-1" }, { present: true, submissionId: "submission-2" }],
      startsAt: "17:00",
    });
  });

  it("adds a person outside the assigned group to the attendance list", async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => ({ id: "activity-1" }), ok: true });
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.click(screen.getByRole("button", { name: "Wybierz uczestnika" }));
    const addPerson = screen.getByRole("listitem", { name: "" });
    expect(addPerson).toHaveTextContent("Ola");
    fireEvent.click(addPerson);
    expect(screen.getByRole("button", { name: "Oznacz Ola jako obecnego" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Oznacz Ola jako obecnego" }));
    fireEvent.submit(screen.getByRole("heading", { name: "Wybierz zajęcia" }).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.participants).toContainEqual({ present: true, submissionId: "submission-3" });
  });

  it("shows confirm on the left and delete on the right for selected activities", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<AttendanceManager activities={activities} groups={groups} recipients={recipients} />);

    fireEvent.change(screen.getByLabelText("Wybierz zajęcia"), { target: { value: "activity-1" } });

    const actions = screen.getByRole("heading", { name: "Wybierz zajęcia" }).closest("form")?.querySelector(".attendance-selected-actions");
    expect(actions?.querySelector(".attendance-selected-actions-left")?.querySelector("button")).toHaveTextContent("Zatwierdź zajęcia");
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
});
