import "dotenv/config";
import { describe, expect, it } from "vitest";
import { sendSmsNotification } from "./smsapi";

const liveTestEnabled = process.env.SMSAPI_LIVE_TEST === "true";

describe.skipIf(!liveTestEnabled)("SMSAPI live integration", () => {
  it("sends a test SMS to the configured recipient", async () => {
    const token = process.env.SMSAPI_TOKEN?.trim();
    expect(token, "SMSAPI_TOKEN must be set for the live SMS test").toBeTruthy();

    await expect(sendSmsNotification({
      recipient: process.env.SMSAPI_RECIPIENT?.trim() || "605946678",
      sender: process.env.SMSAPI_SENDER?.trim() || "Moderato",
      token: token!,
    }, "Test SMS", "studio-wokalne", { throwOnError: true }))
      .resolves.toBe(true);
  });
});
