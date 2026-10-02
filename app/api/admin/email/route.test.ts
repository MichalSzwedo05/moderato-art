import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getContactFormConfig: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  recordMessage: vi.fn(),
  sendEmailMessage: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/contact-config", () => ({ getContactFormConfig: mocks.getContactFormConfig }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ contactSubmission: { findMany: mocks.findMany } }) }));
vi.mock("@/lib/email", () => ({ sendEmailMessage: mocks.sendEmailMessage }));
vi.mock("@/lib/message-history", () => ({ recordMessage: mocks.recordMessage }));

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

function multipartRequest(fields: Record<string, string>, attachment?: File, origin = "https://moderato-art.example") {
  const values = new Map<string, FormDataEntryValue>(Object.entries(fields));
  if (attachment) values.set("attachment", attachment);
  return {
    formData: async () => ({ get: (name: string) => values.get(name) ?? null }),
    headers: new Headers({ origin, "content-type": "multipart/form-data" }),
  } as unknown as Request;
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
    mocks.recordMessage.mockResolvedValue(undefined);
  });

  it("records email sends in the history", async () => {
    const response = await POST(request({ message: "Treść", subject: "Temat", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.recordMessage).toHaveBeenCalledWith("EMAIL", "Treść", 2, "Temat");
  });

  it("does not record failed sends", async () => {
    mocks.sendEmailMessage.mockRejectedValue(new Error("Resend down"));

    const response = await POST(request({ message: "Treść", subject: "Temat", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(502);
    expect(mocks.recordMessage).not.toHaveBeenCalled();
  });

  it("keeps the send successful when the history write fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.recordMessage.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request({ message: "Treść", subject: "Temat", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(consoleError).toHaveBeenCalledWith("Admin email history record failed");
    consoleError.mockRestore();
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

  it("sends a multipart attachment to the selected recipients", async () => {
    const attachment = {
      arrayBuffer: async () => new TextEncoder().encode("PDF content").buffer,
      name: "plan.pdf",
      size: 11,
      type: "application/pdf",
    } as unknown as File;
    const response = await POST(multipartRequest({
      message: "Przypomnienie",
      subject: "Ważne",
      submissionIds: JSON.stringify(["one", "two"]),
    }, attachment));

    expect(response.status).toBe(200);
    expect(mocks.sendEmailMessage).toHaveBeenCalledWith(
      contactConfig.notification,
      ["anna@example.com", "ola@example.com"],
      "Ważne",
      "Przypomnienie",
      {
        attachments: [{ content: expect.any(Buffer), contentType: "application/pdf", filename: "plan.pdf" }],
        throwOnError: true,
      },
    );
  });

  it("rejects an attachment larger than the configured limit", async () => {
    const largeAttachment = { name: "large.zip", size: 40 * 1024 * 1024 + 1, type: "application/zip" } as File;

    const response = await POST(multipartRequest({
      message: "Przypomnienie",
      subject: "Ważne",
      submissionIds: JSON.stringify(["one"]),
    }, largeAttachment));

    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendEmailMessage).not.toHaveBeenCalled();
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
