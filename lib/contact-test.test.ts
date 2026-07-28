import { describe, expect, it } from "vitest";
import { isContactTestEnabled } from "./contact-test";

const validEnvironment = {
  CONTACT_FORM_ENABLED: "true",
  CONTACT_FORM_RECIPIENT: "owner@example.com",
  CONTACT_FORM_TEST_ENABLED: "true",
  CONTACT_FORM_TEST_TOKEN: "a-strong-test-token-that-is-at-least-32-chars",
  RESEND_API_KEY: "re_test",
};

describe("isContactTestEnabled", () => {
  it("requires both flags, mail configuration, and a strong non-placeholder token", () => {
    expect(isContactTestEnabled(validEnvironment)).toBe(true);
    expect(isContactTestEnabled({ ...validEnvironment, CONTACT_FORM_TEST_TOKEN: "too-short" })).toBe(false);
    expect(isContactTestEnabled({ ...validEnvironment, CONTACT_FORM_TEST_TOKEN: "replace-with-a-long-random-test-token" })).toBe(false);
    expect(isContactTestEnabled({ ...validEnvironment, RESEND_API_KEY: "" })).toBe(false);
  });
});
