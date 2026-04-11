import { PrismaClient } from '@prisma/client';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma v6 with SQLite needs the absolute path to handle Next.js cwd differences
const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: `file:${dbPath}`,
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
