import { PrismaClient } from "@prisma/client";

const shared = globalThis as typeof globalThis & { nannyPrisma?: PrismaClient };
export const prisma = (shared.nannyPrisma ||= new PrismaClient());
export const isObjectId = (id: string) => /^[a-f0-9]{24}$/i.test(id);

export function assertAtlasUrl(uri = process.env.MONGODB_URI) {
  if (!uri)
    throw new Error(
      "MONGODB_URI is missing. Add your MongoDB Atlas connection string to .env.",
    );
  const url = new URL(uri);
  if (
    url.protocol !== "mongodb+srv:" ||
    !url.hostname.endsWith(".mongodb.net") ||
    url.pathname.length < 2
  ) {
    throw new Error(
      "MONGODB_URI must be a MongoDB Atlas SRV connection string with a database name.",
    );
  }
}
