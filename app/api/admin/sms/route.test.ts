import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatchUpdate: vi.fn(),
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getContactFormConfig: vi.fn(),
  getOrCreateDispatch: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  markRecipientFailed: vi.fn(),
  markRecipientInFlight: vi.fn(),
  markRecipientSent: vi.fn(),
  failRecipients: new Set<string>(),
  messageDispatchUpdate: vi.fn(),
  recordMessage: vi.fn(),
  sendMmsMessageToRecipients: vi.fn(),
  sendSmsMessage: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/contact-config", () => ({ getContactFormConfig: mocks.getContactFormConfig }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ contactSubmission: { findMany: mocks.findMany }, messageDispatch: { update: mocks.messageDispatchUpdate } }) }));
vi.mock("@/lib/message-history", () => ({ recordMessage: mocks.recordMessage }));
vi.mock("@/lib/message-dispatch", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    finishDispatchStatus: actual.finishDispatchStatus,
    getOrCreateDispatch: mocks.getOrCreateDispatch,
    markRecipientFailed: mocks.markRecipientFailed,
    markRecipientInFlight: mocks.markRecipientInFlight,
    markRecipientSent: mocks.markRecipientSent,
    pendingRecipients: actual.pendingRecipients,
  };
});
vi.mock("@/lib/smsapi", () => ({ isSmsMessageWithinLimit: (value: string) => [...value].length <= 670, normalizeSmsApiPhone: (value: string) => value === "bad" ? undefined : `48${value.replace(/\D/g, "")}`, sendMmsMessageToRecipients: mocks.sendMmsMessageToRecipients, sendSmsMessage: mocks.sendSmsMessage }));

const dispatchKey = "aaaaaaaa-bbbb-cccc-dddd";
const longMessage = "x".repeat(700);

function dispatchFixture(overrides: Record<string, unknown> = {}) {
  return {
    channel: "MMS",
    expiresAt: new Date(Date.now() + 86_400_000),
    failedCount: 0,
    id: "dispatch-1",
    key: dispatchKey,
    message: longMessage,
    recipients: [
      { phone: "48792888578", state: "pending" },
      { phone: "4848600123456", state: "pending" },
    ],
    sentCount: 0,
    status: "IN_PROGRESS",
    totalCount: 2,
    ...overrides,
  };
}

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example" };
const contactConfig = { sms: { recipient: "605946678", sender: "Moderato", token: "smsapi-token" } };

function request(body: unknown, origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/sms", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin },
    method: "POST",
  });
}

describe("POST /api/admin/sms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.getContactFormConfig.mockReturnValue(contactConfig);
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.findMany.mockResolvedValue([
      { id: "one", phone: "792 888 578" },
      { id: "two", phone: "+48 600 123 456" },
    ]);
    mocks.sendSmsMessage.mockResolvedValue(true);
    mocks.getOrCreateDispatch.mockResolvedValue({ dispatch: dispatchFixture(), kind: "created" });
    mocks.sendMmsMessageToRecipients.mockImplementation(async (_config, recipients, _message, _origin, hooks) => {
      const outcomes: Array<{ phone: string; sent: boolean }> = [];
      for (const phone of recipients as string[]) {
        await hooks?.onRecipientStart?.(phone);
        const outcome = { phone, sent: !mocks.failRecipients.has(phone) };
        outcomes.push(outcome);
        await hooks?.onRecipient?.(outcome);
      }
      return outcomes;
    });
    mocks.failRecipients.clear();
    mocks.markRecipientInFlight.mockResolvedValue(undefined);
    mocks.markRecipientSent.mockResolvedValue(undefined);
    mocks.markRecipientFailed.mockResolvedValue(undefined);
    mocks.messageDispatchUpdate.mockResolvedValue({});
    mocks.recordMessage.mockResolvedValue(undefined);
  });

  it("sends only to phones resolved from selected database records", async () => {
    const response = await POST(request({ message: "Przypomnienie", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.sendSmsMessage).toHaveBeenCalledWith(
      contactConfig.sms,
      ["48792888578", "4848600123456"],
      "Przypomnienie",
      { throwOnError: true },
    );
  });

  it("records SMS sends in the history", async () => {
    const response = await POST(request({ message: "Przypomnienie", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.recordMessage).toHaveBeenCalledWith("SMS", "Przypomnienie", 2);
  });

  it("records MMS sends in the history", async () => {
    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.sendMmsMessageToRecipients).toHaveBeenCalled();
    expect(mocks.recordMessage).toHaveBeenCalledWith("MMS", longMessage, 2);
  });

  it("does not record failed sends", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendSmsMessage.mockRejectedValue(new Error("SMSAPI down"));

    const response = await POST(request({ message: "Przypomnienie", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(502);
    expect(mocks.recordMessage).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the send successful when the history write fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.recordMessage.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request({ message: "Przypomnienie", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(consoleError).toHaveBeenCalledWith("Admin SMS history record failed");
    consoleError.mockRestore();
  });

  it("rejects unauthenticated requests before reading recipients", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request({ message: "Nie wysyłaj", submissionIds: ["one"] }));

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendSmsMessage).not.toHaveBeenCalled();
  });

  it("uses MMS for messages longer than the SMS multipart limit", async () => {
    const response = await POST(request({ dispatchKey, message: "a".repeat(671), submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.sendSmsMessage).not.toHaveBeenCalled();
    expect(mocks.sendMmsMessageToRecipients).toHaveBeenCalledWith(
      contactConfig.sms,
      ["48792888578", "4848600123456"],
      "a".repeat(671),
      "https://moderato-art.example",
      expect.objectContaining({ onRecipient: expect.any(Function), onRecipientStart: expect.any(Function) }),
    );
  });

  it("refuses an MMS send without a dispatch key", async () => {
    const response = await POST(request({ message: longMessage, submissionIds: ["one", "two"] }));

    expect(response.status).toBe(400);
    expect(mocks.sendMmsMessageToRecipients).not.toHaveBeenCalled();
  });

  it("rejects a dispatch key that is not a safe token", async () => {
    const response = await POST(request({ dispatchKey: "short", message: longMessage, submissionIds: ["one"] }));

    expect(response.status).toBe(400);
    expect(mocks.getOrCreateDispatch).not.toHaveBeenCalled();
  });

  it("reports a partial MMS send instead of failing the whole request", async () => {
    mocks.failRecipients.add("4848600123456");

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));
    const body = await response.json() as { failed: number; message: string; partial: boolean; sent: number; total: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ failed: 1, partial: true, sent: 1, total: 2 });
    expect(body.message).toContain("MMS wysłano do 1 z 2 odbiorców.");
    expect(body.message).toContain("1 niepowodzeń.");
    expect(mocks.markRecipientInFlight).toHaveBeenCalledWith("dispatch-1", "48792888578");
    expect(mocks.markRecipientInFlight).toHaveBeenCalledWith("dispatch-1", "4848600123456");
    expect(mocks.markRecipientSent).toHaveBeenCalledWith("dispatch-1", "48792888578", 1);
    expect(mocks.markRecipientFailed).toHaveBeenCalledWith("dispatch-1", "4848600123456", 1, 1);
    expect(mocks.recordMessage).toHaveBeenCalledWith("MMS", longMessage, 1);
    expect(mocks.messageDispatchUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        failedCount: 1,
        recipients: [
          { phone: "48792888578", state: "sent" },
          { phone: "4848600123456", state: "failed" },
        ],
        sentCount: 1,
        status: "PARTIAL",
      }),
    }));
  });

  it("counts every recipient once when a partial send is retried", async () => {
    mocks.failRecipients.add("4848600123456");
    mocks.getOrCreateDispatch.mockResolvedValue({
      dispatch: dispatchFixture({
        recipients: [
          { phone: "48792888578", state: "sent" },
          { phone: "4848600123456", state: "pending" },
        ],
        sentCount: 1,
      }),
      kind: "resumed",
    });

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));
    const body = await response.json() as { failed: number; message: string; partial: boolean; sent: number; total: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ failed: 1, partial: true, sent: 1, total: 2 });
    expect(body.message).toContain("MMS wysłano do 1 z 2 odbiorców.");
    expect(body.message).toContain("1 niepowodzeń.");
    expect(body.message).not.toContain("Pozostało");
    expect(mocks.sendMmsMessageToRecipients.mock.calls[0][1]).toEqual(["4848600123456"]);
    expect(mocks.recordMessage).not.toHaveBeenCalled();
  });

  it("answers a completed dispatch without sending it again", async () => {
    mocks.getOrCreateDispatch.mockResolvedValue({
      dispatch: dispatchFixture({
        recipients: [
          { phone: "48792888578", state: "sent" },
          { phone: "4848600123456", state: "sent" },
        ],
        sentCount: 2,
        status: "COMPLETED",
      }),
      kind: "completed",
    });

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));
    const body = await response.json() as { message: string; sent: number; total: number };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ sent: 2, total: 2 });
    expect(body.message).toBe("MMS wysłano do 2 odbiorców.");
    expect(mocks.sendMmsMessageToRecipients).not.toHaveBeenCalled();
    expect(mocks.recordMessage).not.toHaveBeenCalled();
  });

  it("keeps the dispatch unfinished when the send breaks halfway", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendMmsMessageToRecipients.mockImplementation(async (_config, recipients, _message, _origin, hooks) => {
      await hooks?.onRecipientStart?.(recipients[0]);
      await hooks?.onRecipient?.({ phone: recipients[0], sent: true });
      throw new Error("connection reset");
    });

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));

    expect(response.status).toBe(502);
    expect(mocks.messageDispatchUpdate).not.toHaveBeenCalled();
    expect(mocks.recordMessage).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("resends only the recipients that did not go out yet", async () => {
    mocks.getOrCreateDispatch.mockResolvedValue({
      dispatch: dispatchFixture({
        recipients: [
          { phone: "48792888578", state: "sent" },
          { phone: "4848600123456", state: "pending" },
        ],
        sentCount: 1,
      }),
      kind: "resumed",
    });

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.sendMmsMessageToRecipients.mock.calls[0][1]).toEqual(["4848600123456"]);
    expect(mocks.recordMessage).toHaveBeenCalledWith("MMS", longMessage, 1);
  });

  it("refuses to resume a key that belongs to a different message", async () => {
    mocks.getOrCreateDispatch.mockResolvedValue({ dispatch: dispatchFixture(), kind: "conflict" });

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));
    const body = await response.json() as { message: string };

    expect(response.status).toBe(409);
    expect(body.message).toContain("innej treści");
    expect(mocks.sendMmsMessageToRecipients).not.toHaveBeenCalled();
  });

  it("refuses to resume an expired dispatch", async () => {
    mocks.getOrCreateDispatch.mockResolvedValue({ dispatch: dispatchFixture(), kind: "expired" });

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));

    expect(response.status).toBe(409);
    expect(mocks.sendMmsMessageToRecipients).not.toHaveBeenCalled();
  });

  it("does not record history when a resumed send delivers nothing new", async () => {
    mocks.getOrCreateDispatch.mockResolvedValue({
      dispatch: dispatchFixture({
        recipients: [
          { phone: "48792888578", state: "sent" },
          { phone: "4848600123456", state: "failed" },
        ],
        sentCount: 1,
        failedCount: 1,
      }),
      kind: "resumed",
    });
    mocks.sendMmsMessageToRecipients.mockResolvedValue([{ error: "SMSAPI down", phone: "4848600123456", sent: false }]);

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));
    const body = await response.json() as { sent: number };

    expect(response.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(mocks.recordMessage).not.toHaveBeenCalled();
  });

  it("keeps the send successful when the dispatch bookkeeping fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getOrCreateDispatch.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request({ dispatchKey, message: longMessage, submissionIds: ["one", "two"] }));

    expect(response.status).toBe(503);
    expect(consoleError).toHaveBeenCalledWith("Admin MMS dispatch could not be opened");
    consoleError.mockRestore();
  });

  it("rejects records with invalid phone numbers", async () => {
    mocks.findMany.mockResolvedValue([{ id: "bad", phone: "bad" }]);

    const response = await POST(request({ message: "Wiadomość", submissionIds: ["bad"] }));

    expect(response.status).toBe(422);
    expect(mocks.sendSmsMessage).not.toHaveBeenCalled();
  });

  it("fails closed when SMSAPI is not configured", async () => {
    mocks.getContactFormConfig.mockReturnValue({});

    const response = await POST(request({ message: "Wiadomość", submissionIds: ["one"] }));

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
