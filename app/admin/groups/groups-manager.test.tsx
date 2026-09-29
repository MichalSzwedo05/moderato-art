import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GroupsManager } from "./groups-manager";

describe("GroupsManager", () => {
  it("shows only current members and allows adding a member", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ count: 1 }),
      ok: true,
    }));
    render(<GroupsManager
      groups={[
        { id: "one", memberships: [{ submissionId: "person" }], name: "Pierwsza" },
        { id: "two", memberships: [], name: "Druga" },
      ]}
      recipients={[
        { childName: "Anna", email: "anna@example.com", id: "person", parentName: null, phone: null },
        { childName: "Ola", email: "ola@example.com", id: "other", parentName: null, phone: null },
      ]}
    />);

    expect(screen.getAllByText("Anna")).toHaveLength(1);
    expect(screen.getByText("Brak członków grupy.")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Dodaj użytkownika" })[1]);
    expect(screen.getByRole("button", { name: /Anna.*anna@example.com/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Ola.*ola@example.com/ }));
    await user.click(screen.getAllByRole("button", { name: "Dodaj użytkownika" })[1]);

    expect(screen.getByText("Ola")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/admin/groups/two/members", expect.objectContaining({
      body: JSON.stringify({ submissionIds: ["other"] }),
      method: "PUT",
    }));
  });

  it("removes an existing member with the remove control", async () => {
    const user = userEvent.setup();
    render(<GroupsManager
      groups={[{ id: "one", memberships: [{ submissionId: "person" }], name: "Pierwsza" }]}
      recipients={[{ childName: "Anna", email: "anna@example.com", id: "person", parentName: null, phone: null }]}
    />);

    await user.click(screen.getByRole("button", { name: "Usuń Anna z grupy" }));

    expect(screen.getByText("Brak członków grupy.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/admin/groups/one/members", expect.objectContaining({
      body: JSON.stringify({ submissionIds: [] }),
      method: "PUT",
    }));
  });

  it("opens the member picker immediately after creating a group", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ id: "new-group", name: "Nowa grupa" }),
      ok: true,
    }));
    render(<GroupsManager
      groups={[]}
      recipients={[{ childName: "Anna", email: "anna@example.com", id: "person", parentName: null, phone: null }]}
    />);

    await user.type(screen.getByLabelText("Nowa grupa"), "Nowa grupa");
    await user.click(screen.getByRole("button", { name: "Utwórz grupę" }));

    expect(screen.getByLabelText("Dodaj użytkownika")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Anna.*anna@example.com/ })).toBeInTheDocument();
  });
});
