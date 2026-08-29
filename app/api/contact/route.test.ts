import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createSubmission, sendEmail } = vi.hoisted(() => ({ createSubmission: vi.fn(), sendEmail: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmail };
  },
}));
vi.mock("../../../lib/contact-submissions", () => ({ createContactSubmission: createSubmission }));
vi.mock("../../../lib/privacy-policy", () => ({ privacyNoticeVersion: "draft-optional-message-2026-08-25", privacyPolicy: { status: "published" } }));

import { POST } from "./route";
import { resetContactRateLimitForTests } from "../../../lib/contact-rate-limit";

const request = (body = {}) => new Request("https://moderato-art.vercel.app/api/contact", {
  body: JSON.stringify(body),
  headers: {
    "content-type": "application/json",
    origin: "https://moderato-art.vercel.app",
  },
  method: "POST",
});

describe("POST /api/contact", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    delete process.env.CONTACT_FORM_ENABLED;
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_FORM_RECIPIENT;
    delete process.env.CONTACT_RATE_LIMIT_SECRET;
    delete process.env.CONTACT_FORM_RESEND_FROM;
    delete process.env.DATABASE_URL;
    delete process.env.CRON_SECRET;
    createSubmission.mockReset();
    createSubmission.mockResolvedValue({ id: "submission-id" });
    sendEmail.mockReset();
    resetContactRateLimitForTests();
  });

  function enableForm() {
    process.env.CONTACT_FORM_ENABLED = "true";
    process.env.CONTACT_RATE_LIMIT_SECRET = "a-contact-rate-limit-secret-that-is-long-enough";
    process.env.DATABASE_URL = "postgresql://moderato:password@db:5432/moderato";
    process.env.CRON_SECRET = "a-cron-secret-that-is-long-enough";
  }

  function enableNotifications() {
    process.env.RESEND_API_KEY = "re_test-key-that-is-long-enough-for-tests";
    process.env.CONTACT_FORM_RECIPIENT = "owner@moderato-art.pl";
    process.env.CONTACT_FORM_RESEND_FROM = "Moderato Art <kontakt@moderato-art.pl>";
  }

  const validSubmission = {
    addressStreet: "ul. Krokusowa 25",
    birthDate: "2020-05-12",
    childName: "Anna Kowalska",
    city: "Żołędowo",
    email: "anna@example.com",
    group: "Motylki",
    imageConsent: "Nie wyrażam zgody",
    lessonType: "junior-voice",
    paymentAccepted: true,
    phone: "500 000 000",
    postalCode: "86-012",
    preschool: "Przedszkole Moderato",
    privacyNoticeAcknowledged: true,
  };

  it("fails closed without reading or sending the request payload", async () => {
    const response = await POST(request({ parentName: "Anna Kowalska" }));

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ message: "Formularz kontaktowy jest chwilowo niedostępny." });
    expect(createSubmission).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends a validated submission without a test password", async () => {
    enableForm();
    enableNotifications();
    sendEmail.mockResolvedValue({ data: { id: "email-id" }, error: null });

    const response = await POST(request(validSubmission));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Zgłoszenie zostało przyjęte." });
    expect(createSubmission).toHaveBeenCalledWith(expect.objectContaining({
        privacyNoticeAcknowledgedAt: expect.any(Date),
        privacyNoticeVersion: "draft-optional-message-2026-08-25",
      }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Moderato Art <kontakt@moderato-art.pl>",
      to: ["owner@moderato-art.pl"],
    }));
    const notification = sendEmail.mock.calls[0][0] as { replyTo?: string; text: string };
    expect(notification.replyTo).toBeUndefined();
    expect(notification.text).toContain("submission-id");
    expect(notification.text).not.toContain("Anna Kowalska");
    expect(notification.text).not.toContain("anna@example.com");
    expect(notification.text).not.toContain("Proszę o informacje");
  });

  it("requires the privacy acknowledgement before saving or sending", async () => {
    enableForm();

    const response = await POST(request({ ...validSubmission, privacyNoticeAcknowledged: false }));

    expect(response.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects Rytmisolki enrollments that are no longer offered", async () => {
    enableForm();

    const response = await POST(request({ ...validSubmission, lessonType: "rytmika" }));

    expect(response.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("rejects an unknown lesson type before saving or sending", async () => {
    enableForm();

    const response = await POST(request({ ...validSubmission, lessonType: "nieznane-zajecia" }));

    expect(response.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("accepts rehabilitation of voice disorders enrollments without child-only fields", async () => {
    enableForm();

    const participantSubmission = { ...validSubmission, lessonType: "rehabilitacja-zaburzen-glosu" };
    Reflect.deleteProperty(participantSubmission, "preschool");
    Reflect.deleteProperty(participantSubmission, "group");
    Reflect.deleteProperty(participantSubmission, "paymentAccepted");
    const response = await POST(request(participantSubmission));

    expect(response.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledWith(expect.objectContaining({ lessonType: "rehabilitacja-zaburzen-glosu" }));
    expect(createSubmission).toHaveBeenCalledWith(expect.not.objectContaining({ preschool: expect.anything() }));
  });

  it("accepts studio vocal enrollments without child-only fields", async () => {
    enableForm();

    const participantSubmission = { ...validSubmission, lessonType: "studio-wokalne" };
    Reflect.deleteProperty(participantSubmission, "preschool");
    Reflect.deleteProperty(participantSubmission, "group");
    Reflect.deleteProperty(participantSubmission, "paymentAccepted");
    const response = await POST(request(participantSubmission));

    expect(response.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledWith(expect.objectContaining({ lessonType: "studio-wokalne" }));
  });

  it("rejects child-only fields for participant lessons", async () => {
    enableForm();

    const response = await POST(request({ ...validSubmission, lessonType: "studio-wokalne" }));

    expect(response.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it("requires an offer before saving or sending", async () => {
    enableForm();
    const withoutLessonType = { ...validSubmission };
    Reflect.deleteProperty(withoutLessonType, "lessonType");

    const response = await POST(request(withoutLessonType));

    expect(response.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("requires the payment and image consent fields", async () => {
    enableForm();

    const paymentResponse = await POST(request({ ...validSubmission, paymentAccepted: false }));
    expect(paymentResponse.status).toBe(400);

    const imageResponse = await POST(request({ ...validSubmission, imageConsent: "invalid" }));
    expect(imageResponse.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it("requires a valid Polish or international phone number", async () => {
    enableForm();

    const lettersResponse = await POST(request({ ...validSubmission, phone: "abc" }));
    expect(lettersResponse.status).toBe(400);

    const tooShortResponse = await POST(request({ ...validSubmission, phone: "123" }));
    expect(tooShortResponse.status).toBe(400);
    expect(createSubmission).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("accepts formatted Polish and international phone numbers", async () => {
    enableForm();

    const polishResponse = await POST(request(validSubmission));
    expect(polishResponse.status).toBe(200);

    resetContactRateLimitForTests();
    const plusPrefixResponse = await POST(request({ ...validSubmission, phone: "+49 30 123 456 78" }));
    expect(plusPrefixResponse.status).toBe(200);

    resetContactRateLimitForTests();
    const doubleZeroPrefixResponse = await POST(request({ ...validSubmission, phone: "0048600123456" }));
    expect(doubleZeroPrefixResponse.status).toBe(200);
  });

  it("accepts common Polish phone spellings", async () => {
    enableForm();

    const withLeadingZero = await POST(request({ ...validSubmission, phone: "0600 000 000" }));
    expect(withLeadingZero.status).toBe(200);

    resetContactRateLimitForTests();
    const withCountryCode = await POST(request({ ...validSubmission, phone: "48 600 123 456" }));
    expect(withCountryCode.status).toBe(200);

    resetContactRateLimitForTests();
    const plusCountryCode = await POST(request({ ...validSubmission, phone: "+48 500 000 000" }));
    expect(plusCountryCode.status).toBe(200);
  });

  it("keeps the saved submission accepted when notification delivery fails", async () => {
    enableForm();
    enableNotifications();
    sendEmail.mockResolvedValue({ data: null, error: { name: "provider_error" } });

    const response = await POST(request(validSubmission));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Zgłoszenie zostało przyjęte." });
    expect(createSubmission).toHaveBeenCalledTimes(1);
  });

  it("keeps the saved submission accepted when notification delivery times out", async () => {
    enableForm();
    enableNotifications();
    vi.useFakeTimers();
    sendEmail.mockReturnValue(new Promise(() => undefined));

    const responsePromise = POST(request(validSubmission));
    await vi.advanceTimersByTimeAsync(5_000);
    const response = await responsePromise;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Zgłoszenie zostało przyjęte." });
    expect(createSubmission).toHaveBeenCalledTimes(1);
  });

  it("rejects a cross-origin request and an oversized body", async () => {
    enableForm();
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

  it("treats a filled honeypot as a successful no-op", async () => {
    enableForm();

    const response = await POST(request({ ...validSubmission, website: "https://spam.example" }));

    expect(response.status).toBe(200);
    expect(createSubmission).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("stores submissions without Resend and limits repeated authorized attempts", async () => {
    enableForm();
    const databaseOnlyResponse = await POST(request(validSubmission));

    expect(databaseOnlyResponse.status).toBe(200);
    await expect(databaseOnlyResponse.json()).resolves.toEqual({ message: "Zgłoszenie zostało przyjęte." });
    expect(createSubmission).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();

    resetContactRateLimitForTests();
    await POST(request(validSubmission));
    await POST(request(validSubmission));
    await POST(request(validSubmission));

    const rateLimitedResponse = await POST(request(validSubmission));
    expect(rateLimitedResponse.status).toBe(429);
  });
});
