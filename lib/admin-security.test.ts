import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRandomToken,
  createRateLimitIdentifier,
  getAdminAuthConfig,
  getTrustedClientAddress,
  hashToken,
  isMagicToken,
  isSameAdminOrigin,
} from "./admin-security";

const environment = {
  ADMIN_AUTH_RESEND_FROM: "Moderato Art <admin@moderato-art.pl>",
  ADMIN_AUTH_RESEND_KEY: "re_admin_key",
  ADMIN_AUTH_URL: "https://moderato-art.pl",
  ADMIN_CMS_ENABLED: "true",
  ADMIN_EMAIL: "owner@example.com",
  ADMIN_RATE_LIMIT_SECRET: "a-very-long-secret-that-is-at-least-thirty-two-characters",
};

describe("admin security configuration", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("accepts only a complete enabled HTTPS configuration", () => {
    const config = getAdminAuthConfig(environment);

    expect(config?.authOrigin).toBe("https://moderato-art.pl");
    expect(getAdminAuthConfig({ ...environment, ADMIN_CMS_ENABLED: "false" })).toBeUndefined();
    expect(getAdminAuthConfig({ ...environment, ADMIN_AUTH_URL: "https://moderato-art.pl/admin" })).toBeUndefined();
    expect(getAdminAuthConfig({ ...environment, ADMIN_RATE_LIMIT_SECRET: "short" })).toBeUndefined();
    expect(getAdminAuthConfig({ ...environment, ADMIN_AUTH_URL: "http://localhost:3000", NODE_ENV: "development" })?.authOrigin).toBe("http://localhost:3000");
    expect(getAdminAuthConfig({ ...environment, ADMIN_AUTH_URL: "http://localhost:3000" })).toBeUndefined();
  });

  it("creates 32-byte URL-safe secrets and one-way identifiers", () => {
    const token = createRandomToken();

    expect(token).toHaveLength(43);
    expect(isMagicToken(token)).toBe(true);
    expect(hashToken(token)).toHaveLength(64);
    expect(createRateLimitIdentifier("203.0.113.10", environment.ADMIN_RATE_LIMIT_SECRET))
      .not.toContain("203.0.113.10");
  });

  it("requires the configured canonical origin for mutations", () => {
    const config = getAdminAuthConfig(environment);

    expect(config && isSameAdminOrigin("https://moderato-art.pl", config)).toBe(true);
    expect(config && isSameAdminOrigin("https://attacker.example", config)).toBe(false);
  });

  it("uses one local rate-limit identity in development regardless of forwarding headers", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getTrustedClientAddress(new Request("http://localhost:3000", { headers: { "x-forwarded-for": "198.51.100.5" } }))).toBe("localhost");
  });
});
