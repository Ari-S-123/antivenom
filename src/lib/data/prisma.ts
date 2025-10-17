/**
 * Prisma client singleton for AntiVenom database operations
 * Ensures single instance across hot reloads in development
 */

import { PrismaClient } from "@prisma/client";

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
export const prisma = global.prisma || new PrismaClient({
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

