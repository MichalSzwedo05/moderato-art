import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  smsMessageCreate: vi.fn(),
  smsMessageFindMany: vi.fn(),
}));

vi.mock("./prisma", () => ({
  getPrisma: () => ({
    smsMessage: {
      create: mocks.smsMessageCreate,
      findMany: mocks.smsMessageFindMany,
    },
  }),
}));

import { getSmsHistory, recordSmsMessage, smsHistoryMaxRecords, smsHistoryPreviewLength } from "./sms-history";

describe("SMS history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.smsMessageCreate.mockResolvedValue({ id: "log-1" });
    mocks.smsMessageFindMany.mockResolvedValue([]);
  });

  it("records the channel, message and recipient count", async () => {
    await recordSmsMessage("MMS", "Wiadomość", 3);

    expect(mocks.smsMessageCreate).toHaveBeenCalledWith({
      data: { channel: "MMS", message: "Wiadomość", recipientCount: 3 },
      select: { id: true },
    });
  });

  it("returns newest entries first within the record limit", async () => {
    await getSmsHistory();

    expect(mocks.smsMessageFindMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true, message: true, recipientCount: true },
      take: smsHistoryMaxRecords,
    });
  });

  it("trims the message preview to the first 100 characters", async () => {
    const message = "a".repeat(250);
    mocks.smsMessageFindMany.mockResolvedValue([{ createdAt: new Date("2026-09-30T10:00:00.000Z"), message, recipientCount: 12 }]);

    const entries = await getSmsHistory();

    expect(smsHistoryPreviewLength).toBe(100);
    expect(entries[0]).toEqual({
      createdAt: "2026-09-30T10:00:00.000Z",
      messagePreview: "a".repeat(100),
      recipientCount: 12,
      truncated: true,
    });
  });

  it("keeps short messages intact and marks them as not truncated", async () => {
    mocks.smsMessageFindMany.mockResolvedValue([{ createdAt: new Date("2026-09-30T10:00:00.000Z"), message: "Krótka wiadomość", recipientCount: 1 }]);

    const entries = await getSmsHistory();

    expect(entries[0].messagePreview).toBe("Krótka wiadomość");
    expect(entries[0].truncated).toBe(false);
  });
});
