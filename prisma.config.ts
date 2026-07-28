import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.PRISMA_GENERATE !== "true") {
  throw new Error("DATABASE_URL must be set for Prisma commands that access the database.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
