import { describe, expect, it } from "vitest";
import { createFakeMessageHistory, isFakeMessageHistoryEnabled } from "./message-history-fake";
import { emailHistoryChannels, messageHistoryPreviewLength, smsHistoryChannels } from "./message-history-channels";

const now = new Date("2026-09-30T12:00:00.000Z");

describe("fake message history", () => {
  it("stays disabled unless the local flag is set", () => {
    expect(isFakeMessageHistoryEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isFakeMessageHistoryEnabled({ NODE_ENV: "development", SMS_HISTORY_FAKE_DATA: "0" })).toBe(false);
    expect(isFakeMessageHistoryEnabled({ NODE_ENV: "development", SMS_HISTORY_FAKE_DATA: "1" })).toBe(true);
  });

  it("never activates in production", () => {
    expect(isFakeMessageHistoryEnabled({ NODE_ENV: "production", SMS_HISTORY_FAKE_DATA: "1" })).toBe(false);
  });

  it("builds entries with trimmed previews and no channel field", () => {
    const entries = createFakeMessageHistory(undefined, now);

    expect(entries.length).toBeGreaterThan(5);
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual(["createdAt", "messagePreview", "recipientCount", "subject", "truncated"]);
      expect(entry.messagePreview.length).toBeLessThanOrEqual(messageHistoryPreviewLength);
    }
    expect(entries.some((entry) => entry.truncated)).toBe(true);
    expect(entries.some((entry) => entry.subject !== null)).toBe(true);
  });

  it("returns only the requested channel group", () => {
    const smsEntries = createFakeMessageHistory(smsHistoryChannels, now);
    const emailEntries = createFakeMessageHistory(emailHistoryChannels, now);

    expect(smsEntries.every((entry) => entry.subject === null)).toBe(true);
    expect(emailEntries.every((entry) => entry.subject !== null)).toBe(true);
    expect(emailEntries.length).toBeLessThan(smsEntries.length);
  });

  it("orders entries newest first", () => {
    const entries = createFakeMessageHistory(undefined, now);
    const timestamps = entries.map((entry) => new Date(entry.createdAt).getTime());

    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });
});
