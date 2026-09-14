import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeSmsApiPhone, sendSmsMessage, sendSmsNotification } from "./smsapi";

describe("SMSAPI notifications", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends one notification to the configured recipient list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ count: 1, list: [{ status: "QUEUE" }] }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendSmsNotification({ token: "smsapi-token" }, "Anna Kowalska", "junior-voice");

    expect(fetchMock).toHaveBeenCalledWith("https://api.smsapi.pl/sms.do", expect.objectContaining({
      method: "POST",
      headers: {
        Authorization: "Bearer smsapi-token",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }));
    const [, request] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    expect(request.body.get("from")).toBe("Test");
    expect(request.body.get("to")).toBe("792888578");
    expect(request.body.get("format")).toBe("json");
    expect(request.body.get("message")).toBe("Nowe zgloszenie: Anna Kowalska (Junior Voice)");
  });

  it("does not call SMSAPI without configuration", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendSmsNotification(undefined, "Anna Kowalska", "junior-voice");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes Polish phone numbers for SMSAPI", () => {
    expect(normalizeSmsApiPhone("792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("0792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("+48 792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("0048 792 888 578")).toBe("48792888578");
    expect(normalizeSmsApiPhone("not-a-phone")).toBeUndefined();
  });

  it("sends a custom message to multiple recipients", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ count: 2, list: [] }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSmsMessage({ token: "smsapi-token" }, ["48792888578", "48600123456"], "Wiadomość testowa", { throwOnError: true }))
      .resolves.toBe(true);

    const [, request] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    expect(request.body.get("to")).toBe("48792888578,48600123456");
    expect(request.body.get("message")).toBe("Wiadomość testowa");
  });
});
