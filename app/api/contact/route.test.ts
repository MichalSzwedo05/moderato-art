import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/contact", () => {
  it("fails closed without reading or storing the request payload", async () => {
    const response = await POST();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ message: "Formularz kontaktowy jest chwilowo niedostępny." });
  });
});
