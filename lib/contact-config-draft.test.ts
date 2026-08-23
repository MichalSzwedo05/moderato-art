import { describe, expect, it } from "vitest";
import { getContactFormConfig } from "./contact-config";

describe("draft privacy policy activation gate", () => {
  it("allows explicitly enabled non-commercial collection while the policy is a draft", () => {
    expect(getContactFormConfig({
      CONTACT_FORM_ENABLED: "true",
      CONTACT_RATE_LIMIT_SECRET: "a-contact-rate-limit-secret-that-is-long-enough",
      CRON_SECRET: "a-cron-secret-that-is-long-enough",
      DATABASE_URL: "postgresql://moderato:password@db:5432/moderato",
    })).toEqual({ notification: undefined, rateLimitSecret: "a-contact-rate-limit-secret-that-is-long-enough" });
  });
});
