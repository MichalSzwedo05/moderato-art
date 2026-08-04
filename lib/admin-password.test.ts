import { describe, expect, it } from "vitest";
import { verifyAdminPassword } from "./admin-password";

const passwordHash = "$argon2id$v=19$m=65536,p=1,t=3$ETdYhIUIkF40eV6NvGO6JQ$hqQk98eP56MPYwc+6+nw27zSRivAosDwzGPmem1sC/s";

describe("admin password verification", () => {
  it("accepts only the configured username and Argon2id password", async () => {
    await expect(verifyAdminPassword("admin", passwordHash, "admin", "not-a-valid-admin-password")).resolves.toBe(true);
    await expect(verifyAdminPassword("admin", passwordHash, "other", "not-a-valid-admin-password")).resolves.toBe(false);
    await expect(verifyAdminPassword("admin", passwordHash, "admin", "wrong-password")).resolves.toBe(false);
  });
});
