import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageHistoryModal } from "./message-history-modal";
import { emailHistoryChannels, smsHistoryChannels } from "@/lib/message-history";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function close(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function historyResponse(messages: unknown[]) {
  return new Response(JSON.stringify({ messages }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

describe("MessageHistoryModal", () => {
  it("opens the history modal and lists sends with trimmed message previews", async () => {
    const user = userEvent.setup();
    const longMessage = "a".repeat(180);
    fetchMock.mockResolvedValue(historyResponse([
      { createdAt: "2026-09-30T10:15:00.000Z", messagePreview: longMessage.slice(0, 100), recipientCount: 7, subject: null, truncated: true },
      { createdAt: "2026-09-29T08:00:00.000Z", messagePreview: "Przypomnienie o próbie", recipientCount: 2, subject: "Temat próby", truncated: false },
    ]));

    render(<MessageHistoryModal channels={smsHistoryChannels} />);
    await user.click(screen.getByRole("button", { name: "Historia wiadomości" }));

    const dialog = await screen.findByRole("dialog", { name: "Historia wiadomości" });
    const table = within(dialog).getByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Data", "Początek wiadomości", "Liczba odbiorców"]);

    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getAllByRole("cell")[1]).toHaveTextContent(`${"a".repeat(100)}…`);
    expect(within(rows[0]).getAllByRole("cell")[1]).not.toHaveTextContent("a".repeat(101));
    expect(within(rows[0]).getAllByRole("cell")[2]).toHaveTextContent("7");
    expect(within(rows[1]).getAllByRole("cell")[1]).toHaveTextContent("Temat próby");
    expect(within(rows[1]).getAllByRole("cell")[1].textContent).toContain("Przypomnienie o próbie");
    expect(within(rows[1]).getAllByRole("cell")[1].textContent).not.toContain("…");
    expect(within(table).queryByText("Kanał")).not.toBeInTheDocument();
    expect(within(table).queryByText("MMS")).not.toBeInTheDocument();
    expect(within(table).queryByText("EMAIL")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/message-history?channels=SMS%2CMMS");
  });

  it("shows an empty state when nothing was sent yet", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(historyResponse([]));

    render(<MessageHistoryModal channels={smsHistoryChannels} />);
    await user.click(screen.getByRole("button", { name: "Historia wiadomości" }));

    expect(await screen.findByText("Nie ma jeszcze żadnych wysłanych wiadomości.")).toBeInTheDocument();
  });

  it("shows the failure message when the history cannot be loaded", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Brak dostępu." }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    }));

    render(<MessageHistoryModal channels={smsHistoryChannels} />);
    await user.click(screen.getByRole("button", { name: "Historia wiadomości" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Brak dostępu.");
  });

  it("closes the modal and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(historyResponse([]));

    render(<MessageHistoryModal channels={smsHistoryChannels} />);
    const trigger = screen.getByRole("button", { name: "Historia wiadomości" });
    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Zamknij okno" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("requests only the channels of its own instance", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(historyResponse([]));

    const { unmount } = render(<MessageHistoryModal channels={emailHistoryChannels} />);
    await user.click(screen.getByRole("button", { name: "Historia wiadomości" }));
    await screen.findByText("Nie ma jeszcze żadnych wysłanych wiadomości.");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/message-history?channels=EMAIL");
    unmount();

    render(<MessageHistoryModal channels={smsHistoryChannels} />);
    await user.click(screen.getAllByRole("button", { name: "Historia wiadomości" })[0]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/message-history?channels=SMS%2CMMS"));
  });
});
