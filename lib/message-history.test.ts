import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  messageLogCreate: vi.fn(),
  messageLogFindMany: vi.fn(),
}));

vi.mock("./prisma", () => ({
  getPrisma: () => ({
    messageLog: {
      create: mocks.messageLogCreate,
      findMany: mocks.messageLogFindMany,
    },
  }),
}));

import { getMessageHistory, messageHistoryMaxRecords, messageHistoryPreviewLength, recordMessage } from "./message-history";

describe("message history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageLogCreate.mockResolvedValue({ id: "log-1" });
    mocks.messageLogFindMany.mockResolvedValue([]);
  });

  it("records SMS sends without a subject", async () => {
    await recordMessage("SMS", "Przypomnienie", 3);

    expect(mocks.messageLogCreate).toHaveBeenCalledWith({
      data: { channel: "SMS", message: "Przypomnienie", recipientCount: 3, subject: null },
      select: { id: true },
    });
  });

  it("records email sends with the subject", async () => {
    await recordMessage("EMAIL", "Treść", 2, "  Temat ćwiczeń  ");

    expect(mocks.messageLogCreate).toHaveBeenCalledWith({
      data: { channel: "EMAIL", message: "Treść", recipientCount: 2, subject: "Temat ćwiczeń" },
      select: { id: true },
    });
  });

  it("returns newest entries first within the record limit", async () => {
    await getMessageHistory();

    expect(mocks.messageLogFindMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { channel: true, createdAt: true, message: true, recipientCount: true, subject: true },
      take: messageHistoryMaxRecords,
    });
  });

  it("trims the message preview to the first 100 characters", async () => {
    const message = "a".repeat(250);
    mocks.messageLogFindMany.mockResolvedValue([{ channel: "MMS", createdAt: new Date("2026-09-30T10:00:00.000Z"), message, recipientCount: 12, subject: null }]);

    const entries = await getMessageHistory();

    expect(messageHistoryPreviewLength).toBe(100);
    expect(entries[0]).toEqual({
      channel: "MMS",
      createdAt: "2026-09-30T10:00:00.000Z",
      messagePreview: "a".repeat(100),
      recipientCount: 12,
      subject: null,
      truncated: true,
    });
  });

  it("keeps short messages intact and marks them as not truncated", async () => {
    mocks.messageLogFindMany.mockResolvedValue([{ channel: "EMAIL", createdAt: new Date("2026-09-30T10:00:00.000Z"), message: "Krótka wiadomość", recipientCount: 1, subject: "Temat" }]);

    const entries = await getMessageHistory();

    expect(entries[0].messagePreview).toBe("Krótka wiadomość");
    expect(entries[0].subject).toBe("Temat");
    expect(entries[0].truncated).toBe(false);
  });

  it("falls back to a known channel for unexpected values", async () => {
    mocks.messageLogFindMany.mockResolvedValue([{ channel: "PUSH", createdAt: new Date("2026-09-30T10:00:00.000Z"), message: "Treść", recipientCount: 1, subject: null }]);

    const entries = await getMessageHistory();

    expect(entries[0].channel).toBe("SMS");
  });
});
