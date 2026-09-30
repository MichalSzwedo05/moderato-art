import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  messageDispatchCreate: vi.fn(),
  messageDispatchDeleteMany: vi.fn(),
  messageDispatchFindUnique: vi.fn(),
  messageDispatchUpdate: vi.fn(),
}));

vi.mock("./prisma", () => ({
  getPrisma: () => ({
    messageDispatch: {
      create: mocks.messageDispatchCreate,
      findUnique: mocks.messageDispatchFindUnique,
      update: mocks.messageDispatchUpdate,
    },
  }),
}));

import {
  dispatchExpiresAt,
  finishDispatchStatus,
  getOrCreateDispatch,
  markRecipientFailed,
  markRecipientInFlight,
  markRecipientSent,
  pendingRecipients,
} from "./message-dispatch";

const now = new Date("2026-10-01T09:00:00.000Z");

function dispatchRow(overrides: Record<string, unknown> = {}) {
  return {
    channel: "MMS",
    expiresAt: new Date("2026-10-08T09:00:00.000Z"),
    failedCount: 0,
    id: "dispatch-1",
    key: "key-abcdefghijklmnop",
    message: "Treść",
    recipients: [
      { phone: "48111111111", state: "pending" },
      { phone: "48222222222", state: "pending" },
    ],
    sentCount: 0,
    status: "IN_PROGRESS",
    totalCount: 2,
    ...overrides,
  };
}

describe("message dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageDispatchFindUnique.mockResolvedValue(null);
    mocks.messageDispatchUpdate.mockResolvedValue({ failedCount: 0, sentCount: 1, totalCount: 2 });
  });

  it("creates a dispatch on first use and keeps every recipient pending", async () => {
    mocks.messageDispatchCreate.mockResolvedValue(dispatchRow());

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("created");
    expect(mocks.messageDispatchCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        channel: "MMS",
        expiresAt: dispatchExpiresAt(now),
        message: "Treść",
        recipients: [
          { phone: "48111111111", state: "pending" },
          { phone: "48222222222", state: "pending" },
        ],
        sentCount: 0,
        failedCount: 0,
        status: "IN_PROGRESS",
        totalCount: 2,
      }),
    });
  });

  it("resumes the same key without touching recipients that already went out", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow({
      recipients: [
        { phone: "48111111111", state: "sent" },
        { phone: "48222222222", state: "pending" },
      ],
      sentCount: 1,
    }));

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("resumed");
    expect(mocks.messageDispatchCreate).not.toHaveBeenCalled();
    expect(pendingRecipients(result.dispatch).map((recipient) => recipient.phone)).toEqual(["48222222222"]);
  });

  it("refuses a key reused for a different message", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow());

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Inna treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("conflict");
    expect(mocks.messageDispatchCreate).not.toHaveBeenCalled();
  });

  it("refuses a key reused for a different recipient list or order", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow());

    await expect(getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48222222222", "48111111111"], now }))
      .resolves.toEqual(expect.objectContaining({ kind: "conflict" }));
    await expect(getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111"], now }))
      .resolves.toEqual(expect.objectContaining({ kind: "conflict" }));
  });

  it("reports a finished dispatch instead of sending it again", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow({
      recipients: [
        { phone: "48111111111", state: "sent" },
        { phone: "48222222222", state: "sent" },
      ],
      sentCount: 2,
      status: "COMPLETED",
    }));

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("completed");
    expect(mocks.messageDispatchCreate).not.toHaveBeenCalled();
  });

  it("requeues a partial dispatch and clears the failures of the previous attempt", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow({
      recipients: [
        { phone: "48111111111", state: "sent" },
        { phone: "48222222222", state: "failed" },
      ],
      sentCount: 1,
      failedCount: 1,
      status: "PARTIAL",
    }));
    mocks.messageDispatchUpdate.mockResolvedValue(dispatchRow({
      recipients: [
        { phone: "48111111111", state: "sent" },
        { phone: "48222222222", state: "pending" },
      ],
      sentCount: 1,
    }));

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("resumed");
    expect(result.dispatch.failedCount).toBe(0);
    expect(pendingRecipients(result.dispatch).map((recipient) => recipient.phone)).toEqual(["48222222222"]);
    expect(mocks.messageDispatchUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        failedCount: 0,
        recipients: [
          { phone: "48111111111", state: "sent" },
          { phone: "48222222222", state: "pending" },
        ],
        status: "IN_PROGRESS",
      },
      where: { id: "dispatch-1" },
    }));
  });

  it("never queues a recipient that was already in flight when the send broke", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow({
      recipients: [
        { phone: "48111111111", state: "sent" },
        { phone: "48222222222", state: "sending" },
      ],
      sentCount: 1,
    }));

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("resumed");
    expect(pendingRecipients(result.dispatch)).toEqual([]);
  });

  it("takes over a dispatch opened by a request that arrived at the same time", async () => {
    mocks.messageDispatchCreate.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    mocks.messageDispatchFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(dispatchRow({ sentCount: 1, recipients: [{ phone: "48111111111", state: "sent" }, { phone: "48222222222", state: "pending" }] }));

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("resumed");
  });

  it("surfaces a create failure that is not a key collision", async () => {
    mocks.messageDispatchCreate.mockRejectedValue(new Error("database is gone"));
    mocks.messageDispatchFindUnique.mockResolvedValue(null);

    await expect(getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111"], now }))
      .rejects.toThrow("database is gone");
  });

  it("treats an expired dispatch as unusable rather than resuming it", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow({ expiresAt: new Date("2026-09-30T09:00:00.000Z") }));

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111", "48222222222"], now });

    expect(result.kind).toBe("expired");
  });

  it("records a delivered recipient so it is never sent twice", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue({ recipients: dispatchRow().recipients });

    await markRecipientSent("dispatch-1", "48111111111", 1);

    expect(mocks.messageDispatchUpdate).toHaveBeenCalledWith({
      data: {
        recipients: [
          { phone: "48111111111", state: "sent" },
          { phone: "48222222222", state: "pending" },
        ],
        sentCount: 1,
      },
      select: { failedCount: true, sentCount: true, totalCount: true },
      where: { id: "dispatch-1" },
    });
  });

  it("records a failed recipient separately from a delivered one", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue({ recipients: [{ phone: "48111111111", state: "sent" }, { phone: "48222222222", state: "pending" }] });

    await markRecipientFailed("dispatch-1", "48222222222", 1, 1);

    expect(mocks.messageDispatchUpdate).toHaveBeenCalledWith({
      data: {
        recipients: [
          { phone: "48111111111", state: "sent" },
          { phone: "48222222222", state: "failed" },
        ],
        failedCount: 1,
        sentCount: 1,
      },
      select: { failedCount: true, sentCount: true, totalCount: true },
      where: { id: "dispatch-1" },
    });
  });

  it("marks a recipient as in flight without clearing one that already went out", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue({ recipients: [{ phone: "48111111111", state: "sent" }, { phone: "48222222222", state: "pending" }] });
    mocks.messageDispatchUpdate.mockResolvedValue({ id: "dispatch-1" });

    await markRecipientInFlight("dispatch-1", "48111111111");
    await markRecipientInFlight("dispatch-1", "48222222222");

    expect(mocks.messageDispatchUpdate).toHaveBeenNthCalledWith(1, {
      data: {
        recipients: [
          { phone: "48111111111", state: "sent" },
          { phone: "48222222222", state: "pending" },
        ],
      },
      select: { id: true },
      where: { id: "dispatch-1" },
    });
    expect(mocks.messageDispatchUpdate).toHaveBeenNthCalledWith(2, {
      data: {
        recipients: [
          { phone: "48111111111", state: "sent" },
          { phone: "48222222222", state: "sending" },
        ],
      },
      select: { id: true },
      where: { id: "dispatch-1" },
    });
  });

  it("ignores a corrupt recipient list instead of trusting it", async () => {
    mocks.messageDispatchFindUnique.mockResolvedValue(dispatchRow({
      recipients: [{ phone: "48111111111", state: "quantum" }, null, "48111111111"],
    }));

    const result = await getOrCreateDispatch({ channel: "MMS", key: "key-abcdefghijklmnop", message: "Treść", recipients: ["48111111111"], now });

    expect(result.dispatch.recipients).toEqual([]);
  });

  it("marks a dispatch complete only when nothing failed", () => {
    expect(finishDispatchStatus(0)).toBe("COMPLETED");
    expect(finishDispatchStatus(1)).toBe("PARTIAL");
  });
});
