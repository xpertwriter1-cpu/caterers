import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
try {
  const url = new URL(process.env.MONGODB_URI || "");
  if (
    url.protocol !== "mongodb+srv:" ||
    !url.hostname.endsWith(".mongodb.net") ||
    url.pathname.length < 2
  ) {
    throw new Error("invalid Atlas URL");
  }
  await prisma.$runCommandRaw({ ping: 1 });
  console.log("Connected to MongoDB Atlas through Prisma.");
  await Promise.all([
    prisma.user.findFirst({ select: { id: true, name: true, email: true, role: true } }),
    prisma.service.findFirst(),
    prisma.booking.findFirst(),
    prisma.order.findFirst(),
    prisma.inquiry.findFirst(),
  ]);
  console.log("Existing application collections read successfully with the Prisma schema.");
} catch (error) {
  // Provider errors may include connection strings. Never echo their full message.
  console.error(
    "Atlas connection failed. Check MONGODB_URI, database credentials and Atlas Network Access.",
  );
  console.error(
    "Error type:",
    error instanceof Error ? error.name : "Unknown error",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
