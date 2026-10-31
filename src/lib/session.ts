import { createHash } from "node:crypto";
import { getIronSession } from "iron-session";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionData } from "./types";

export function sessionOptions() {
  const secret = process.env.SESSION_SECRET;
  if (!secret)
    throw new Error(
      "SESSION_SECRET is missing. Set a long random secret in .env.",
    );
  return {
    password: createHash("sha256").update(secret).digest("hex"),
    cookieName: "nanny_session",
    ttl: 60 * 60 * 8,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}
export function getSession(req: IncomingMessage, res: ServerResponse) {
  return getIronSession<SessionData>(req, res, sessionOptions());
}
