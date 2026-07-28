import { describe, expect, it } from "vitest";
import { getDatabaseAdapterKind, getMigrationDatabaseUrl } from "./database-url";

describe("database URL configuration", () => {
  it("uses Neon for pooled and direct Neon URLs", () => {
    expect(getDatabaseAdapterKind("postgresql://user:password@ep-calm-sky-pooler.eu-central-1.aws.neon.tech/app?sslmode=require")).toBe("neon");
    expect(getDatabaseAdapterKind("postgresql://user:password@ep-calm-sky.eu-central-1.aws.neon.tech/app?sslmode=require")).toBe("neon");
  });

  it("uses the PostgreSQL adapter for local URLs", () => {
    expect(getDatabaseAdapterKind("postgresql://moderato:password@localhost:5432/moderato")).toBe("postgres");
  });

  it("prefers the direct URL for migrations", () => {
    expect(getMigrationDatabaseUrl("postgresql://direct", "postgresql://pooled", false)).toBe("postgresql://direct");
  });

  it("fails database commands without a configured URL", () => {
    expect(() => getMigrationDatabaseUrl(undefined, undefined, false)).toThrow(/DIRECT_URL or DATABASE_URL/);
  });
});
