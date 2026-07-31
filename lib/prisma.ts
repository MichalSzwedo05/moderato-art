import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseAdapterKind } from "./database-url";

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set before Prisma can access the database.");
  }

  const adapter = getDatabaseAdapterKind(databaseUrl) === "neon"
    ? new PrismaNeon({ connectionString: databaseUrl })
    : new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
}

export function getPrisma() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const prisma = createPrismaClient();

  globalForPrisma.prisma = prisma;

  return prisma;
}
