import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { spawn } from "node:child_process";

const command = process.argv[2];
process.env.NODE_ENV = command === "dev" ? "development" : "production";
loadEnvConfig(process.cwd(), command === "dev");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    command,
    ...(command === "dev" ? ["--webpack"] : []),
    "--port",
    process.env.PORT || "3000",
  ],
  { stdio: "inherit", env: process.env, windowsHide: true },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
