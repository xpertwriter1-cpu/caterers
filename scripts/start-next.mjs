import { loadEnvConfig } from "@next/env";
import { spawn } from "node:child_process";

const command = process.argv[2];
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
