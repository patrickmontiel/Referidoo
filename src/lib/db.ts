import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function createPrismaClient() {
  const envUrl = process.env.DATABASE_URL;
  const isRemote = envUrl?.startsWith("libsql://") || envUrl?.startsWith("https://");

  const url = isRemote
    ? envUrl!
    : `file:${path.resolve(process.cwd(), "dev.db")}`;

  const authToken = isRemote ? (process.env.TURSO_AUTH_TOKEN ?? "") : undefined;

  const adapter = new PrismaLibSql({ url, ...(authToken !== undefined ? { authToken } : {}) });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
