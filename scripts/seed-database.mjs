import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { createRequire } from "node:module";

loadEnvConfig(process.cwd());
const require = createRequire(import.meta.url);
const { seedDatabase } = require("../.seed-build/db.js");
const { prisma } = require("../.seed-build/prisma.js");
try {
  await seedDatabase();
  console.log(
    "Missing catalogue items and the configured admin account are ready.",
  );
} catch (error) {
  console.error(
    "Seeding failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
