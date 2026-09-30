import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mmsContentCreate: vi.fn(),
}));

vi.mock("./prisma", () => ({
  getPrisma: () => ({
    mmsContent: { create: mocks.mmsContentCreate },
  }),
}));

import { isSmsMessageWithinLimit, normalizeSmsApiPhone, sendMmsMessage, sendMmsMessageToRecipients, sendSmsMessage, sendSmsNotification } from "./smsapi";

describe("SMSAPI notifications", () => {
  beforeEach(() => {
    mocks.mmsContentCreate.mockResolvedValue({ id: "mms-content-id" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("switches to MMS above the multipart SMS limit", () => {
    expect(isSmsMessageWithinLimit("a".repeat(306))).toBe(true);
    expect(isSmsMessageWithinLimit("a".repeat(307))).toBe(false);
    expect(isSmsMessageWithinLimit("ą".repeat(137))).toBe(true);
    expect(isSmsMessageWithinLimit("ą".repeat(138))).toBe(false);
  });

  it("sends MMS with the public logo and short stored text content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ count: 1, list: [{ status: "QUEUE" }] }) });
    vi.stubGlobal("fetch", fetchMock);

    await sendMmsMessage({ recipient: "605946678", sender: "Moderato", token: "smsapi-token" }, ["48792888578"], "message", "https://moderato-art.example", { throwOnError: true });

    expect(mocks.mmsContentCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ message: "message" }) }));

    const [, request] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    const smil = request.body.get("smil") || "";
    expect(smil).toContain("region=\"Image\"");
    expect(smil).toContain("https://www.moderato-art.pl/moderato-logo.jpg");
    expect(smil).toContain("https://moderato-art.example/api/mms-content/mms-content-id");
    expect(smil).toContain("region=\"Text\"");
  });

  it("keeps the MMS text resource URL short for long messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ count: 1, list: [{ status: "QUEUE" }] }) });
    vi.stubGlobal("fetch", fetchMock);

    const message = "Szanowni Państwo, ".repeat(300);
    await sendMmsMessage({ recipient: "605946678", sender: "Moderato", token: "smsapi-token" }, ["48792888578"], message, "https://moderato-art.example", { throwOnError: true });

    const [, request] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    const smil = request.body.get("smil") || "";
    const textUrl = smil.match(/<text src="([^"]+)"/)?.[1] || "";

    expect(message.length).toBeGreaterThan(1000);
    expect(textUrl.length).toBeLessThan(120);
  });

  it("surfaces the SMSAPI MMS rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ error: 999, message: "System error" }) }));

    await expect(sendMmsMessage({ recipient: "605946678", sender: "Moderato", token: "smsapi-token" }, ["48792888578"], "message", "https://moderato-art.example", { throwOnError: true }))
      .rejects.toThrow("SMSAPI MMS rejected the message: System error");
  });

  it("reports the outcome of every recipient in a batched MMS send", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ count: 1 }) })
      .mockResolvedValueOnce({ ok: false, text: vi.fn().mockResolvedValue("provider down"), status: 503 })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ count: 1 }) });
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const outcomes = await sendMmsMessageToRecipients(
      { recipient: "605946678", sender: "Moderato", token: "smsapi-token" },
      ["48111111111", "48222222222", "48333333333"],
      "message",
      "https://moderato-art.example",
    );

    expect(outcomes).toEqual([
      { phone: "48111111111", sent: true },
      { error: expect.stringContaining("503"), phone: "48222222222", sent: false },
      { phone: "48333333333", sent: true },
    ]);
    consoleError.mockRestore();
  });

  it("reports progress after every recipient so the send can be resumed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ count: 1 }) }));
    const onRecipient = vi.fn();

    await sendMmsMessageToRecipients(
      { recipient: "605946678", sender: "Moderato", token: "smsapi-token" },
      ["48111111111", "48222222222"],
      "message",
      "https://moderato-art.example",
      { onRecipient },
    );

    expect(onRecipient.mock.calls.map(([outcome]) => outcome)).toEqual([
      { phone: "48111111111", sent: true },
      { phone: "48222222222", sent: true },
    ]);
  });

  it("keeps sending the remaining recipients after one fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ error: 999, message: "System error" }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ count: 1 }) });
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const outcomes = await sendMmsMessageToRecipients(
      { recipient: "605946678", sender: "Moderato", token: "smsapi-token" },
      ["48111111111", "48222222222"],
      "message",
      "https://moderato-art.example",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(outcomes.map((outcome) => outcome.sent)).toEqual([false, true]);
    consoleError.mockRestore();
  });

  it("marks a recipient as in flight before the provider call", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      calls.push("provider");
      return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({ count: 1 }) });
    }));

    await sendMmsMessageToRecipients(
      { recipient: "605946678", sender: "Moderato", token: "smsapi-token" },
      ["48111111111"],
      "message",
      "https://moderato-art.example",
      { onRecipientStart: (phone) => { calls.push(`start:${phone}`); } },
    );

    expect(calls).toEqual(["start:48111111111", "provider"]);
  });

  it("does not call the provider when the in flight marker fails", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const outcomes = await sendMmsMessageToRecipients(
      { recipient: "605946678", sender: "Moderato", token: "smsapi-token" },
      ["48111111111"],
      "message",
      "https://moderato-art.example",
      { onRecipientStart: () => Promise.reject(new Error("database is gone")) },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(outcomes).toEqual([{ error: "database is gone", phone: "48111111111", sent: false }]);
    consoleError.mockRestore();
  });

  it("refuses a batched MMS send without a provider configuration", async () => {
    await expect(sendMmsMessageToRecipients(undefined, ["48111111111"], "message", "https://moderato-art.example"))
      .rejects.toThrow("SMSAPI configuration is missing");
  });

  it("sends one notification to the configured recipient list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ count: 1, list: [{ status: "QUEUE" }] }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendSmsNotification({ recipient: "605946678", sender: "Moderato", token: "smsapi-token" }, "Anna Kowalska", "junior-voice");

    expect(fetchMock).toHaveBeenCalledWith("https://api.smsapi.pl/sms.do", expect.objectContaining({
      method: "POST",
      headers: {
        Authorization: "Bearer smsapi-token",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }));
    const [, request] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    expect(request.body.get("from")).toBe("Moderato");
    expect(request.body.get("to")).toBe("605946678");
    expect(request.body.get("format")).toBe("json");
    expect(request.body.get("max_parts")).toBe("2");
    expect(request.body.get("message")).toBe("Nowe zgloszenie: Anna Kowalska (Junior Voice)");
  });

  it("does not call SMSAPI without configuration", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendSmsNotification(undefined, "Anna Kowalska", "junior-voice");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes Polish phone numbers for SMSAPI", () => {
    expect(normalizeSmsApiPhone("792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("0792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("+48 792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("0048 792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("not-a-phone")).toBeUndefined();
  });

  it("sends a custom message to multiple recipients", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ count: 2, list: [] }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSmsMessage({ recipient: "605946678", sender: "Moderato", token: "smsapi-token" }, ["48792888578", "48600123456"], "Wiadomość testowa", { throwOnError: true }))
      .resolves.toBe(true);

    const [, request] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    expect(request.body.get("to")).toBe("48792888578,48600123456");
    expect(request.body.get("message")).toBe("Wiadomość testowa");
  });
});
