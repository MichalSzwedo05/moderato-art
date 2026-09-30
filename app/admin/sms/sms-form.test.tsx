import { render, screen, waitFor } from "@testing-library/react";
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

    expect(screen.getByText(/\/10000 znaków · do 2 części SMS, dłuższe wiadomości MMS · wybrano\s+2/)).toBeInTheDocument();
  });

  it("removes a contact from the selected recipients box", async () => {
    const user = userEvent.setup();
    render(<SmsForm recipients={[{ childName: "Anna Kowalska", id: "one", parentName: null, phone: "792 888 578" }]} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Usuń Anna Kowalska" }));

    expect(screen.getByText("Zaznaczone kontakty pojawią się tutaj.")).toBeInTheDocument();
  });

  async function submitPartialThenComplete() {
    const user = userEvent.setup();
    const responses = [
      { json: async () => ({ failed: 1, message: "MMS wysłano do 1 z 2 odbiorców. 1 niepowodzeń.", partial: true, sent: 1, total: 2 }), ok: true },
      { json: async () => ({ message: "MMS wysłano do 2 odbiorców.", sent: 2, total: 2 }), ok: true },
    ];
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));
    vi.stubGlobal("fetch", fetchMock);

    render(<SmsForm recipients={[
      { childName: "Anna", id: "one", parentName: null, phone: "792 888 578" },
      { childName: "Ola", id: "two", parentName: null, phone: "600 123 456" },
    ]} />);

    await user.click(screen.getAllByRole("checkbox")[0]);
    await user.click(screen.getAllByRole("checkbox")[1]);
    await user.type(screen.getByLabelText("Wiadomość"), "Przypomnienie o próbie");
    await user.click(screen.getByRole("button", { name: "Wyślij SMS" }));

    expect(await screen.findByText(/MMS wysłano do 1 z 2 odbiorców/)).toBeInTheDocument();
    const firstKey = (JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body) as { dispatchKey: string }).dispatchKey;

    return { fetchMock, firstKey, user };
  }

  it("keeps the selection and reuses the dispatch key after a partial send", async () => {
    const { fetchMock, firstKey, user } = await submitPartialThenComplete();

    expect((fetchMock.mock.calls[0][1] as { body: string }).body).toContain("one");
    expect((fetchMock.mock.calls[0][1] as { body: string }).body).toContain("two");
    expect(screen.getByLabelText("Wiadomość")).toHaveValue("Przypomnienie o próbie");

    await user.click(screen.getByRole("button", { name: "Wyślij SMS" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as { body: string }).body) as { dispatchKey: string; message: string; submissionIds: string[] };
    expect(secondBody.dispatchKey).toBe(firstKey);
    expect(secondBody.submissionIds).toEqual(["one", "two"]);

    expect(await screen.findByText("MMS wysłano do 2 odbiorców.")).toBeInTheDocument();
    expect(screen.getByLabelText("Wiadomość")).toHaveValue("");
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();
    expect(screen.getAllByRole("checkbox")[1]).not.toBeChecked();
  });

  it("mints a new dispatch key when the message or recipients change", async () => {
    const { fetchMock, firstKey, user } = await submitPartialThenComplete();

    await user.type(screen.getByLabelText("Wiadomość"), " dodatkowe");
    await user.click(screen.getByRole("button", { name: "Wyślij SMS" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as { body: string }).body) as { dispatchKey: string };
    expect(secondBody.dispatchKey).not.toBe(firstKey);
  });

  it("forgets the resume key when the server rejects the send", async () => {
    const user = userEvent.setup();
    const responses = [
      { json: async () => ({ message: "MMS wysłano do 1 z 2 odbiorców.", partial: true }), ok: true },
      { json: async () => ({ message: "Ten klucz wysyłki był już użyty dla innej treści." }), ok: false },
      { json: async () => ({ message: "MMS wysłano do 2 odbiorców." }), ok: true },
    ];
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()));
    vi.stubGlobal("fetch", fetchMock);

    render(<SmsForm recipients={[
      { childName: "Anna", id: "one", parentName: null, phone: "792 888 578" },
      { childName: "Ola", id: "two", parentName: null, phone: "600 123 456" },
    ]} />);
    await user.click(screen.getAllByRole("checkbox")[1]);
    await user.type(screen.getByLabelText("Wiadomość"), "Przypomnienie o próbie");
    await user.click(screen.getByRole("button", { name: "Wyślij SMS" }));
    await screen.findByText(/MMS wysłano do 1 z 2/);

    await user.click(screen.getByRole("button", { name: "Wyślij SMS" }));
    expect(await screen.findByText(/klucz wysyłki/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Wyślij SMS" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Wyślij SMS" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const keys = fetchMock.mock.calls.map(([, init]) => (JSON.parse((init as { body: string }).body) as { dispatchKey: string }).dispatchKey);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });
});
