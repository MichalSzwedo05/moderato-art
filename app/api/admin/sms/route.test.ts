import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getAdminAuthConfig: vi.fn(),
  getAdminSession: vi.fn(),
  getContactFormConfig: vi.fn(),
  isSameAdminOrigin: vi.fn(),
  sendSmsMessage: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAuthConfig: mocks.getAdminAuthConfig, getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/admin-security", () => ({ isSameAdminOrigin: mocks.isSameAdminOrigin }));
vi.mock("@/lib/contact-config", () => ({ getContactFormConfig: mocks.getContactFormConfig }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ contactSubmission: { findMany: mocks.findMany } }) }));
vi.mock("@/lib/smsapi", () => ({ normalizeSmsApiPhone: (value: string) => value === "bad" ? undefined : `48${value.replace(/\D/g, "")}`, sendSmsMessage: mocks.sendSmsMessage }));

import { POST } from "./route";

const authConfig = { authOrigin: "https://moderato-art.example" };
const contactConfig = { sms: { recipient: "605946678", sender: "Moderato", token: "smsapi-token" } };

function request(body: unknown, origin = "https://moderato-art.example") {
  return new Request("https://moderato-art.example/api/admin/sms", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin },
    method: "POST",
  });
}

describe("POST /api/admin/sms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthConfig.mockReturnValue(authConfig);
    mocks.getAdminSession.mockResolvedValue({ id: "session" });
    mocks.getContactFormConfig.mockReturnValue(contactConfig);
    mocks.isSameAdminOrigin.mockReturnValue(true);
    mocks.findMany.mockResolvedValue([
      { id: "one", phone: "792 888 578" },
      { id: "two", phone: "+48 600 123 456" },
    ]);
    mocks.sendSmsMessage.mockResolvedValue(true);
  });

  it("sends only to phones resolved from selected database records", async () => {
    const response = await POST(request({ message: "Przypomnienie", submissionIds: ["one", "two"] }));

    expect(response.status).toBe(200);
    expect(mocks.sendSmsMessage).toHaveBeenCalledWith(
      contactConfig.sms,
      ["48792888578", "4848600123456"],
      "Przypomnienie",
      { throwOnError: true },
    );
  });

  it("rejects unauthenticated requests before reading recipients", async () => {
    mocks.getAdminSession.mockResolvedValue(undefined);

    const response = await POST(request({ message: "Nie wysyłaj", submissionIds: ["one"] }));

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendSmsMessage).not.toHaveBeenCalled();
  });

  it("rejects records with invalid phone numbers", async () => {
    mocks.findMany.mockResolvedValue([{ id: "bad", phone: "bad" }]);

    const response = await POST(request({ message: "Wiadomość", submissionIds: ["bad"] }));

    expect(response.status).toBe(422);
    expect(mocks.sendSmsMessage).not.toHaveBeenCalled();
  });

  it("fails closed when SMSAPI is not configured", async () => {
    mocks.getContactFormConfig.mockReturnValue({});

    const response = await POST(request({ message: "Wiadomość", submissionIds: ["one"] }));

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
