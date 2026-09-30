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

import { getMessageHistory, recordMessage } from "./message-history";
import {
  emailHistoryChannels,
  messageHistoryMaxRecords,
  messageHistoryPreviewLength,
  parseMessageHistoryChannels,
  smsHistoryChannels,
} from "./message-history-channels";

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

  it("keeps SMS and MMS history in its own channel group", async () => {
    await getMessageHistory(smsHistoryChannels);

    expect(smsHistoryChannels).toEqual(["SMS", "MMS"]);
    expect(mocks.messageLogFindMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: messageHistoryMaxRecords,
      where: { channel: { in: ["SMS", "MMS"] } },
    }));
  });

  it("keeps email history in its own channel group", async () => {
    await getMessageHistory(emailHistoryChannels);

    expect(mocks.messageLogFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { channel: { in: ["EMAIL"] } },
    }));
  });

  it("never exposes the stored channel to the admin", async () => {
    mocks.messageLogFindMany.mockResolvedValue([{ createdAt: new Date("2026-09-30T10:00:00.000Z"), message: "Treść", recipientCount: 2, subject: null }]);

    const entries = await getMessageHistory(emailHistoryChannels);

    expect(Object.keys(entries[0]).sort()).toEqual(["createdAt", "messagePreview", "recipientCount", "subject", "truncated"]);
  });

  it("trims the message preview to the first 100 characters", async () => {
    const message = "a".repeat(250);
    mocks.messageLogFindMany.mockResolvedValue([{ createdAt: new Date("2026-09-30T10:00:00.000Z"), message, recipientCount: 12, subject: null }]);

    const entries = await getMessageHistory(smsHistoryChannels);

    expect(messageHistoryPreviewLength).toBe(100);
    expect(entries[0]).toEqual({
      createdAt: "2026-09-30T10:00:00.000Z",
      messagePreview: "a".repeat(100),
      recipientCount: 12,
      subject: null,
      truncated: true,
    });
  });

  it("keeps short messages intact and marks them as not truncated", async () => {
    mocks.messageLogFindMany.mockResolvedValue([{ createdAt: new Date("2026-09-30T10:00:00.000Z"), message: "Krótka wiadomość", recipientCount: 1, subject: "Temat" }]);

    const entries = await getMessageHistory(emailHistoryChannels);

    expect(entries[0].messagePreview).toBe("Krótka wiadomość");
    expect(entries[0].subject).toBe("Temat");
    expect(entries[0].truncated).toBe(false);
  });

  it("parses requested channels and rejects unknown ones", () => {
    expect(parseMessageHistoryChannels(null)).toBeUndefined();
    expect(parseMessageHistoryChannels("SMS,MMS")).toEqual(["SMS", "MMS"]);
    expect(parseMessageHistoryChannels("EMAIL")).toEqual(["EMAIL"]);
    expect(parseMessageHistoryChannels("PUSH,SMS")).toEqual(["SMS"]);
    expect(parseMessageHistoryChannels("PUSH")).toEqual([]);
  });
});
