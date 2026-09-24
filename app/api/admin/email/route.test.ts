import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getContactFormConfig: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  sendEmailMessage: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/contact-config", () => ({ getContactFormConfig: mocks.getContactFormConfig }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ contactSubmission: { findMany: mocks.findMany } }) }));
vi.mock("@/lib/email", () => ({ sendEmailMessage: mocks.sendEmailMessage }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example" };
const contactConfig = { notification: { resendFrom: "Moderato <hello@moderato-art.example>", resendKey: "re_test" } };

function request(body: unknown, origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/email", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin },
    method: "POST",
  });
}

describe("POST /api/admin/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.getContactFormConfig.mockReturnValue(contactConfig);
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.findMany.mockResolvedValue([
      { email: "anna@example.com", id: "one" },
      { email: "ola@example.com", id: "two" },
    ]);
    mocks.sendEmailMessage.mockResolvedValue(true);
  });

  it("sends only to emails resolved from selected database records", async () => {
    const response = await POST(request({ message: "Przypomnienie", subject: "Ważne", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.sendEmailMessage).toHaveBeenCalledWith(
      contactConfig.notification,
      ["anna@example.com", "ola@example.com"],
      "Ważne",
      "Przypomnienie",
      { throwOnError: true },
    );
  });

  it("rejects unauthenticated requests before reading recipients", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request({ message: "Nie wysyłaj", subject: "Temat", submissionIds: ["one"] }));

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendEmailMessage).not.toHaveBeenCalled();
  });

  it("fails closed when Resend is not configured", async () => {
    mocks.getContactFormConfig.mockReturnValue({});

    const response = await POST(request({ message: "Wiadomość", subject: "Temat", submissionIds: ["one"] }));

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects records with invalid email addresses", async () => {
    mocks.findMany.mockResolvedValue([{ email: "invalid", id: "bad" }]);

    const response = await POST(request({ message: "Wiadomość", subject: "Temat", submissionIds: ["bad"] }));

    expect(response.status).toBe(422);
    expect(mocks.sendEmailMessage).not.toHaveBeenCalled();
  });
});
