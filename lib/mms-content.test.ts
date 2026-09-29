import { describe, expect, it } from "vitest";
import { createMmsContentToken, readMmsContentToken } from "./mms-content";

describe("MMS content tokens", () => {
  it("round-trips compressed message content", () => {
    const message = "Szanowni Państwo, ".repeat(100);
    const token = createMmsContentToken(message, "smsapi-token", 1_000);

    expect(readMmsContentToken(token, "smsapi-token", 2_000)).toBe(message);
    expect(token.length).toBeGreaterThan(0);
  });
});
