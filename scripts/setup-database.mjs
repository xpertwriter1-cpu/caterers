import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
try {
  // Sparse indexes allow legacy/guest orders without a token or payment reference.
  // Do not replace these with optional Prisma @unique fields, which create non-sparse indexes.
  await prisma.$runCommandRaw({
    createIndexes: "users",
    indexes: [{ key: { email: 1 }, name: "email_1", unique: true }],
  });
  await prisma.$runCommandRaw({
    createIndexes: "orders",
    indexes: [
      {
        key: { accessToken: 1 },
        name: "accessToken_1",
        unique: true,
        sparse: true,
      },
      {
        key: { paymentReference: 1 },
        name: "paymentReference_1",
        unique: true,
        sparse: true,
      },
    ],
  });
  console.log(
    "MongoDB indexes are configured. Existing records were preserved.",
  );
} catch (error) {
  console.error(
    "Database index setup failed. Review existing indexes and duplicate data in Atlas.",
  );
  console.error(
    "Error type:",
    error instanceof Error ? error.name : "Unknown error",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
