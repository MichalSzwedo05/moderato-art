import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));
const testToken = "test-token-that-is-longer-than-thirty-two-chars";

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmail };
  },
}));

import { POST } from "./route";
import { resetContactTestRateLimitForTests } from "../../../lib/contact-rate-limit";

const request = (body = {}, token = testToken) => new Request("https://moderato-art.vercel.app/api/contact", {
  body: JSON.stringify(body),
  headers: {
    "content-type": "application/json",
    "origin": "https://moderato-art.vercel.app",
    "x-contact-test-token": token,
  },
  method: "POST",
});

describe("POST /api/contact", () => {
  beforeEach(() => {
    delete process.env.CONTACT_FORM_ENABLED;
    delete process.env.CONTACT_FORM_TEST_ENABLED;
    delete process.env.CONTACT_FORM_TEST_TOKEN;
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_FORM_RECIPIENT;
    sendEmail.mockReset();
    resetContactTestRateLimitForTests();
  });

  function enableTestMode() {
    process.env.CONTACT_FORM_ENABLED = "true";
    process.env.CONTACT_FORM_TEST_ENABLED = "true";
    process.env.CONTACT_FORM_TEST_TOKEN = testToken;
    process.env.RESEND_API_KEY = "re_test";
    process.env.CONTACT_FORM_RECIPIENT = "owner@example.com";
  }

  const validSubmission = {
    email: "anna@example.com",
    lessonType: "rytmika",
    message: "To jest syntetyczna wiadomość testowa.",
    parentName: "Anna Kowalska",
  };

  it("fails closed without reading or sending the request payload", async () => {
    const response = await POST(request({ parentName: "Anna Kowalska" }));

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ message: "Formularz kontaktowy jest chwilowo niedostępny." });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends a validated synthetic test message only with both flags and the test token", async () => {
    enableTestMode();
    sendEmail.mockResolvedValue({ data: { id: "email-id" }, error: null });

    const response = await POST(request(validSubmission));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Wiadomość testowa została wysłana." });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Moderato Art test <onboarding@resend.dev>",
      to: ["owner@example.com"],
    }));
  });

  it("rejects an invalid test token before parsing or sending a message", async () => {
    enableTestMode();

    const response = await POST(request({}, "wrong-token"));

    expect(response.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request and an oversized body", async () => {
    enableTestMode();
    const crossOriginRequest = request(validSubmission);
    const crossOriginResponse = await POST(new Request(crossOriginRequest, {
      headers: {
        ...Object.fromEntries(crossOriginRequest.headers),
        origin: "https://example.com",
      },
    }));

    expect(crossOriginResponse.status).toBe(403);

    const oversizedResponse = await POST(request({
      ...validSubmission,
      message: "a".repeat(10_001),
    }));

    expect(oversizedResponse.status).toBe(413);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("fails without Resend configuration and limits repeated authorized attempts", async () => {
    enableTestMode();
    delete process.env.RESEND_API_KEY;
    const unavailableResponse = await POST(request(validSubmission));

    expect(unavailableResponse.status).toBe(503);

    resetContactTestRateLimitForTests();
    process.env.RESEND_API_KEY = "re_test";
    sendEmail.mockResolvedValue({ data: { id: "email-id" }, error: null });
    await POST(request(validSubmission));
    await POST(request(validSubmission));
    await POST(request(validSubmission));

    const rateLimitedResponse = await POST(request(validSubmission));
    expect(rateLimitedResponse.status).toBe(429);
  });
});
