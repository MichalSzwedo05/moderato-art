import { describe, expect, it } from "vitest";
import { getContactFormConfig, isContactFormConfigured } from "./contact-config";

const validEnvironment = {
  CONTACT_FORM_ENABLED: "true",
  CONTACT_FORM_RECIPIENT: "owner@moderato-art.pl",
  CONTACT_FORM_RESEND_FROM: "Moderato Art <kontakt@moderato-art.pl>",
  CONTACT_RATE_LIMIT_SECRET: "a-contact-rate-limit-secret-that-is-long-enough",
  CRON_SECRET: "a-cron-secret-that-is-long-enough",
  DATABASE_URL: "postgresql://moderato:password@db:5432/moderato",
  RESEND_API_KEY: "re_live-key-that-is-long-enough-for-tests",
};

describe("contact form configuration", () => {
  it("requires the explicit flag and usable server configuration", () => {
    expect(isContactFormConfigured(validEnvironment)).toBe(true);
    expect(getContactFormConfig(validEnvironment)).toMatchObject({
      notification: {
        recipient: "owner@moderato-art.pl",
        resendFrom: "Moderato Art <kontakt@moderato-art.pl>",
      },
    });
    expect(isContactFormConfigured({ ...validEnvironment, CONTACT_FORM_ENABLED: "false" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, RESEND_API_KEY: "re_replace-with-a-key" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, RESEND_API_KEY: "re_x" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, CONTACT_FORM_RECIPIENT: "" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, DATABASE_URL: "x" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, CRON_SECRET: "short" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, CONTACT_RATE_LIMIT_SECRET: "short" })).toBe(false);
  });
});
