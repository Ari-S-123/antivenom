/**
 * Prisma client singleton for AntiVenom database operations
 * Ensures single instance across hot reloads in development
 */

import { PrismaClient } from "@prisma/client";

/**
 * Resolve and validate the database connection URL for Prisma.
 * Ensures the URL starts with the required "postgresql://" or "postgres://" protocol.
 * Falls back to the local docker-compose Postgres instance when missing/invalid.
 */
function resolveDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL;
  const defaultLocalUrl = "postgresql://antivenom:antivenom@localhost:5432/antivenom";

  const hasValidProtocol = (url: string): boolean => /^(?:prisma\+)?postgres(?:ql)?:\/\//.test(url);

  if (typeof configuredUrl !== "string" || configuredUrl.trim() === "") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Prisma] DATABASE_URL is not set. Falling back to local Postgres at postgresql://antivenom:***@localhost:5432/antivenom"
      );
    }
    process.env.DATABASE_URL = defaultLocalUrl;
    return defaultLocalUrl;
  }

  if (!hasValidProtocol(configuredUrl)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Prisma] DATABASE_URL has an invalid protocol. Expected 'postgresql://', 'postgres://', or 'prisma+postgres://'. Falling back to local Postgres."
      );
    }
    process.env.DATABASE_URL = defaultLocalUrl;
    return defaultLocalUrl;
  }

  return configuredUrl;
}

/**
 * Global type augmentation for Prisma client in development
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client instance
 * Reuses existing instance in development to prevent connection pool exhaustion
 */
const databaseUrl = resolveDatabaseUrl();

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

/**
 * Gracefully disconnect on process termination
 */
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
