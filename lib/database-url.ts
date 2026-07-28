const buildOnlyDatabaseUrl = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export function getMigrationDatabaseUrl(
  directUrl: string | undefined,
  databaseUrl: string | undefined,
  allowBuildFallback: boolean,
) {
  const resolvedUrl = directUrl ?? databaseUrl;

  if (resolvedUrl) {
    return resolvedUrl;
  }

  if (allowBuildFallback) {
    return buildOnlyDatabaseUrl;
  }

  throw new Error("DIRECT_URL or DATABASE_URL must be set for Prisma commands that access the database.");
}

export function getDatabaseAdapterKind(databaseUrl: string) {
  const hostname = new URL(databaseUrl).hostname;

  return hostname.endsWith(".neon.tech") ? "neon" : "postgres";
}
