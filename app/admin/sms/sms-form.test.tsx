import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SmsForm } from "./sms-form";

describe("SmsForm", () => {
  it("allows selecting a contact and entering a message", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ message: "Wiadomość wysłano do 1 odbiorców." }),
      ok: true,
    }));
    render(<SmsForm groups={[{ id: "group", name: "Junior Voice", submissionIds: ["one"] }]} recipients={[{ childName: "Anna Kowalska", id: "one", parentName: null, phone: "792 888 578" }]} />);

    await user.click(screen.getAllByRole("checkbox")[1]);
    await user.type(screen.getByLabelText("Wiadomość"), "Przypomnienie");

    expect(screen.getByRole("heading", { name: "Odbiorcy" })).toBeInTheDocument();
    expect(screen.getByText("Junior Voice")).toBeInTheDocument();
    expect(screen.getAllByText("Anna Kowalska")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Wyślij SMS" })).toBeEnabled();
  });

  it("selects all members when a group is selected", async () => {
    const user = userEvent.setup();
    render(<SmsForm groups={[{ id: "group", name: "Junior Voice", submissionIds: ["one", "two"] }]} recipients={[
      { childName: "Anna", id: "one", parentName: null, phone: "792 888 578" },
      { childName: "Ola", id: "two", parentName: null, phone: "600 123 456" },
    ]} />);

    await user.click(screen.getByRole("checkbox", { name: /Junior Voice/ }));

    expect(screen.getByText(/\/1530 znaków · wybrano\s+2/)).toBeInTheDocument();
  });

  it("removes a contact from the selected recipients box", async () => {
    const user = userEvent.setup();
    render(<SmsForm recipients={[{ childName: "Anna Kowalska", id: "one", parentName: null, phone: "792 888 578" }]} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Usuń Anna Kowalska" }));

    expect(screen.getByText("Zaznaczone kontakty pojawią się tutaj.")).toBeInTheDocument();
  });
});
