import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __competidexPrisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as { __competidexPrisma?: PrismaClient };

export const prisma = globalForPrisma.__competidexPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__competidexPrisma = prisma;
}
