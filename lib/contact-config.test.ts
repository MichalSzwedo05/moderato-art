import { describe, expect, it } from "vitest";
import { getContactFormConfig, isContactFormConfigured } from "./contact-config";

const validEnvironment = {
  CONTACT_FORM_ENABLED: "true",
  CONTACT_FORM_RESEND_FROM: "Moderato Art <kontakt@moderato-art.pl>",
  CONTACT_FORM_RECIPIENT: "moderato.artis@gmail.com",
  CONTACT_RATE_LIMIT_SECRET: "a-contact-rate-limit-secret-that-is-long-enough",
  CRON_SECRET: "a-cron-secret-that-is-long-enough",
  DATABASE_URL: "postgresql://moderato:password@db:5432/moderato",
  RESEND_TOKEN: "re_live-key-that-is-long-enough-for-tests",
};

describe("contact form configuration", () => {
  it("requires the explicit flag and usable server configuration", () => {
    expect(isContactFormConfigured(validEnvironment)).toBe(true);
    expect(getContactFormConfig(validEnvironment)).toMatchObject({
      notification: {
        recipient: "moderato.artis@gmail.com",
        resendFrom: "Moderato Art <kontakt@moderato-art.pl>",
      },
    });
    expect(isContactFormConfigured({ ...validEnvironment, CONTACT_FORM_ENABLED: "false" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, RESEND_TOKEN: "re_replace-with-a-key" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, RESEND_TOKEN: "re_x" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, DATABASE_URL: "x" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, CRON_SECRET: "short" })).toBe(false);
    expect(isContactFormConfigured({ ...validEnvironment, CONTACT_RATE_LIMIT_SECRET: "short" })).toBe(false);
  });


  it("accepts a complete Google Sheets configuration", () => {
    expect(getContactFormConfig({
      ...validEnvironment,
      GOOGLE_SHEETS_SPREADSHEET_ID: "1tek0IUfI64-xh0WTHq_fDGfskz91eNcg6lxGlduG25M",
      GOOGLE_SHEETS_RANGE: "Sheet1!A:I",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "sheets-writer@moderato-art.iam.gserviceaccount.com",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----",
    })).toMatchObject({
      sheets: {
        range: "Sheet1!A:I",
        spreadsheetId: "1tek0IUfI64-xh0WTHq_fDGfskz91eNcg6lxGlduG25M",
      },
    });
  });

  it("enables SMS notifications when an API token is configured", () => {
    expect(getContactFormConfig({
      ...validEnvironment,
      SMSAPI_TOKEN: "smsapi-token",
      SMSAPI_SENDER: "Moderato",
      SMSAPI_RECIPIENT: "605946678",
    })).toMatchObject({
      sms: { recipient: "605946678", sender: "Moderato", token: "smsapi-token" },
    });
  });

  it("accepts the standard Resend API key environment variable", () => {
    expect(getContactFormConfig({
      ...validEnvironment,
      RESEND_TOKEN: undefined,
      RESEND_API_KEY: "re_live-key-that-is-long-enough-for-tests",
    })).toMatchObject({
      notification: {
        resendFrom: "Moderato Art <kontakt@moderato-art.pl>",
      },
    });
  });

  it("keeps SMS available when optional Resend is disabled", () => {
    expect(getContactFormConfig({
      ...validEnvironment,
      CONTACT_FORM_RESEND_FROM: "Moderato Art <kontakt@moderato-art.pl>",
      RESEND_TOKEN: undefined,
      SMSAPI_TOKEN: "smsapi-token",
      SMSAPI_SENDER: "Moderato",
      SMSAPI_RECIPIENT: "605946678",
    })).toMatchObject({
      notification: undefined,
      sms: { recipient: "605946678", sender: "Moderato", token: "smsapi-token" },
    });
  });

  it("fails closed when Google Sheets configuration is incomplete", () => {
    expect(isContactFormConfigured({
      ...validEnvironment,
      GOOGLE_SHEETS_SPREADSHEET_ID: "1tek0IUfI64-xh0WTHq_fDGfskz91eNcg6lxGlduG25M",
    })).toBe(false);
  });
});
