import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  batchSend: vi.fn(),
  emailSend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    batch = { send: mocks.batchSend };
    emails = { send: mocks.emailSend };
  },
}));

import { sendEmailMessage } from "./email";

const config = { resendFrom: "Moderato <hello@example.com>", resendKey: "re_test" };

describe("sendEmailMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batchSend.mockResolvedValue({ data: {}, error: null });
    mocks.emailSend.mockResolvedValue({ data: {}, error: null });
  });

  it("uses individual email sends when an attachment is present", async () => {
    const attachment = { content: Buffer.from("file"), filename: "plan.pdf", contentType: "application/pdf" };

    await expect(sendEmailMessage(config, ["anna@example.com", "ola@example.com"], "Temat", "Treść", { attachments: [attachment] })).resolves.toBe(true);

    expect(mocks.batchSend).not.toHaveBeenCalled();
    expect(mocks.emailSend).toHaveBeenCalledTimes(2);
    expect(mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [attachment],
      to: ["anna@example.com"],
    }));
  });

  it("keeps batch sending for messages without attachments", async () => {
    await expect(sendEmailMessage(config, ["anna@example.com"], "Temat", "Treść")).resolves.toBe(true);

    expect(mocks.emailSend).not.toHaveBeenCalled();
    expect(mocks.batchSend).toHaveBeenCalledOnce();
  });
});
