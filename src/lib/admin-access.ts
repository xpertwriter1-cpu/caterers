import type { Environment } from "./types";

export function adminEmails(env: Environment = process.env): string[] {
  const emails = [...new Set((env.ADMIN_EMAILS || env.ADMIN_EMAIL || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (emails.length > 2 || emails.some((email) => !/^[^\s@<> ,;]+@[^\s@<> ,;]+\.[^\s@<> ,;]+$/.test(email)))
    throw new Error("Configure one or two valid ADMIN_EMAILS.");
  return emails;
}

export function userRole(user: { email: string; role: string; roleAssignedByAdmin?: boolean | null }) {
  return adminEmails().includes(user.email.toLowerCase()) ||
    (user.role === "admin" && user.roleAssignedByAdmin === true)
    ? "admin" : "customer";
}
