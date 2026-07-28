import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getMigrationDatabaseUrl } from "./lib/database-url";

const databaseUrl = getMigrationDatabaseUrl(
  process.env.DIRECT_URL,
  process.env.DATABASE_URL,
  process.env.PRISMA_GENERATE === "true",
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
