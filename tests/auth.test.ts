import { beforeEach, afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { app, dependencies, bookingMailer } from "../src/lib/controllers";
import { adminEmails, userRole } from "../src/lib/admin-access";
import { createBookingMailer } from "../src/lib/booking-email";
import type { RequestContext, ResponseContext } from "../src/lib/router";

process.env.ADMIN_EMAILS = "mandela3168@gmail.com";
const originalDb = dependencies.db;
beforeEach(() => {
  // Prisma delegates are proxies; provide ordinary methods for Node's mock tracker.
  dependencies.db = { user: {
    async findUnique() { return null; }, async create() { return null; },
    async updateMany() { return { count: 0 }; }, async update() { return null; },
  } } as unknown as typeof dependencies.db;
});
afterEach(() => { mock.restoreAll(); dependencies.db = originalDb; });
const ownerId = "111111111111111111111111";
const customerId = "222222222222222222222222";
const baseUser = { id: customerId, name: "Customer", email: "customer@example.com", role: "customer", emailVerifiedAt: new Date(), verificationAttempts: 0 };

async function request(path: string, body: Record<string, string> = {}, signedIn = false) {
  const route = app.match("POST", path)!;
  assert.ok(route);
  const req: RequestContext = {
    params: route.params, query: {}, body, get: () => undefined,
    session: {
      user: signedIn ? { id: ownerId, name: "Owner", email: "mandela3168@gmail.com", role: "admin" } : undefined,
      regenerate(callback) { delete this.user; callback(); },
      destroy(callback) { delete this.user; callback(); },
    },
  };
  let redirect = "";
  let status = 200;
  const res: ResponseContext = {
    status(code) { status = code; return this; }, set() { return this; },
    render() {}, send() {}, json() {}, clearCookie() {},
    redirect(codeOrPath: number | string, path?: string) { redirect = path || String(codeOrPath); },
    sendStatus(code) { status = code; },
  };
  await app.run(route, req, res);
  return { req, redirect, status };
}

test("only configured emails and explicitly assigned admins get admin access", () => {
  assert.deepEqual(adminEmails({ ADMIN_EMAILS: " ONE@example.com, two@example.com,one@example.com " }), ["one@example.com", "two@example.com"]);
  assert.throws(() => adminEmails({ ADMIN_EMAILS: "a@x.com,b@x.com,c@x.com" }));
  assert.equal(userRole({ ...baseUser, role: "admin" }), "customer");
  assert.equal(userRole({ ...baseUser, role: "admin", roleAssignedByAdmin: true }), "admin");
  assert.equal(userRole({ ...baseUser, email: "mandela3168@gmail.com" }), "admin");
});

test("signup sends a code to the signup email and does not log in", async () => {
  mock.method(dependencies.db.user, "findUnique", async () => null);
  let created: Record<string, unknown> = {};
  mock.method(dependencies.db.user, "create", async ({ data }: { data: Record<string, unknown> }) => { created = data; return { ...baseUser, ...data }; });
  let stored: Record<string, unknown> = {};
  mock.method(dependencies.db.user, "updateMany", async ({ data }: { data: Record<string, unknown> }) => { stored = data; return { count: 1 }; });
  let deliveredCode = "";
  mock.method(bookingMailer, "sendVerification", async (email: string, code: string) => { assert.equal(email, "mandela3168@gmail.com"); deliveredCode = code; });
  const result = await request("/register", { name: "Owner", email: " Mandela3168@gmail.com ", password: "LongPassword123!", role: "admin" });
  assert.equal(created.role, "admin");
  assert.equal(result.req.session.user, undefined);
  assert.match(result.redirect, /^\/verify-email\?email=mandela3168%40gmail.com$/);
  assert.match(deliveredCode, /^\d{6}$/);
  assert.ok(await bcrypt.compare(deliveredCode, String(stored.verificationCodeHash)));
});

test("client cannot promote themselves with a signup field", async () => {
  mock.method(dependencies.db.user, "findUnique", async () => null);
  mock.method(dependencies.db.user, "create", async ({ data }: { data: Record<string, unknown> }) => { assert.equal(data.role, "customer"); return baseUser; });
  mock.method(dependencies.db.user, "updateMany", async () => ({ count: 1 }));
  mock.method(bookingMailer, "sendVerification", async () => {});
  await request("/register", { name: "Client", email: baseUser.email, password: "LongPassword123!", role: "admin" });
});

test("correct code verifies the account and redirects to login without a session", async () => {
  const user = { ...baseUser, emailVerifiedAt: null, verificationCodeHash: await bcrypt.hash("123456", 4), verificationExpiresAt: new Date(Date.now() + 60000) };
  mock.method(dependencies.db.user, "findUnique", async () => user);
  const writes = mock.method(dependencies.db.user, "updateMany", async () => ({ count: 1 }));
  const result = await request("/verify-email", { email: user.email, code: "123456" });
  assert.equal(result.redirect, "/login");
  assert.equal(result.req.session.user, undefined);
  assert.equal(writes.mock.callCount(), 2);
  assert.equal(writes.mock.calls[1].arguments[0]!.data!.verificationCodeHash, null);
});

test("wrong, expired, exhausted and already used codes cannot verify", async () => {
  const user = { ...baseUser, emailVerifiedAt: null as Date | null, verificationCodeHash: await bcrypt.hash("123456", 4), verificationExpiresAt: new Date(Date.now() + 60000) };
  const find = mock.method(dependencies.db.user, "findUnique", async () => user);
  const writes = mock.method(dependencies.db.user, "updateMany", async () => ({ count: 1 }));
  for (const [patch, code] of [
    [{}, "999999"],
    [{ verificationExpiresAt: new Date(0) }, "123456"],
    [{ verificationAttempts: 5 }, "123456"],
    [{ emailVerifiedAt: new Date() }, "123456"],
  ] as const) {
    find.mock.mockImplementation(async () => ({ ...user, ...patch }));
    const result = await request("/verify-email", { email: user.email, code });
    assert.match(result.redirect, /^\/verify-email/);
    assert.equal(result.req.session.user, undefined);
  }
  assert.equal(writes.mock.callCount(), 1);
});

test("forgot password emails a one-time token, stores only its hash and reveals nothing", async () => {
  const find = mock.method(dependencies.db.user, "findUnique", async () => baseUser);
  let stored: Record<string, unknown> = {};
  mock.method(dependencies.db.user, "updateMany", async ({ data }: { data: Record<string, unknown> }) => { stored = data; return { count: 1 }; });
  let delivered = "";
  const mail = mock.method(bookingMailer, "sendPasswordReset", async (email: string, token: string) => { assert.equal(email, baseUser.email); delivered = token; });
  const known = await request("/forgot-password", { email: ` ${baseUser.email.toUpperCase()} ` });
  assert.match(delivered, /^[a-f0-9]{64}$/);
  assert.notEqual(stored.passwordResetTokenHash, delivered);
  assert.equal(stored.passwordResetTokenHash, crypto.createHash("sha256").update(delivered).digest("hex"));
  assert.ok((stored.passwordResetExpiresAt as Date).getTime() <= Date.now() + 30 * 60000);
  find.mock.mockImplementation(async () => null as never);
  const unknown = await request("/forgot-password", { email: "nobody@example.com" });
  assert.equal(mail.mock.callCount(), 1);
  assert.equal(unknown.redirect, known.redirect);
  assert.deepEqual(unknown.req.session.flash, known.req.session.flash);
});

test("forgot password is limited to one email a minute and hides delivery failures", async () => {
  mock.method(dependencies.db.user, "findUnique", async () => baseUser);
  const writes = mock.method(dependencies.db.user, "updateMany", async () => ({ count: 0 }));
  const mail = mock.method(bookingMailer, "sendPasswordReset", async () => {});
  await request("/forgot-password", { email: baseUser.email });
  assert.equal(mail.mock.callCount(), 0);
  writes.mock.mockImplementation(async () => ({ count: 1 }));
  mail.mock.mockImplementation(async () => { throw new Error("SMTP down"); });
  const quietLog = mock.method(console, "error", () => {});
  const failed = await request("/forgot-password", { email: baseUser.email });
  assert.equal(failed.redirect, "/forgot-password");
  assert.equal(quietLog.mock.callCount(), 1);
  assert.equal(writes.mock.calls.at(-1)!.arguments[0]!.data!.passwordResetTokenHash, null);
});

test("a valid reset link changes the password once and does not sign in", async () => {
  const token = "a".repeat(64);
  const writes = mock.method(dependencies.db.user, "updateMany", async () => ({ count: 1 }));
  const result = await request("/reset-password", { token, password: "BrandNewPassword1!", confirmPassword: "BrandNewPassword1!" });
  assert.equal(result.redirect, "/login");
  assert.equal(result.req.session.user, undefined);
  const { where, data } = writes.mock.calls[0].arguments[0]!;
  assert.equal(where!.passwordResetTokenHash, crypto.createHash("sha256").update(token).digest("hex"));
  assert.ok((where!.passwordResetExpiresAt as { gt: Date }).gt instanceof Date);
  assert.ok(await bcrypt.compare("BrandNewPassword1!", String(data!.passwordHash)));
  assert.equal(data!.passwordResetTokenHash, null);
  assert.ok(data!.emailVerifiedAt instanceof Date);
});

test("expired, used, malformed and mismatched resets change nothing", async () => {
  const token = "b".repeat(64);
  const writes = mock.method(dependencies.db.user, "updateMany", async () => ({ count: 0 }));
  const used = await request("/reset-password", { token, password: "BrandNewPassword1!", confirmPassword: "BrandNewPassword1!" });
  assert.equal(used.redirect, "/forgot-password");
  assert.equal(writes.mock.callCount(), 1);
  const malformed = await request("/reset-password", { token: "not-a-token", password: "BrandNewPassword1!", confirmPassword: "BrandNewPassword1!" });
  assert.equal(malformed.redirect, "/forgot-password");
  const mismatch = await request("/reset-password", { token, password: "BrandNewPassword1!", confirmPassword: "SomethingElse12345" });
  assert.equal(mismatch.redirect, `/reset-password?token=${token}`);
  const short = await request("/reset-password", { token, password: "short", confirmPassword: "short" });
  assert.equal(short.redirect, `/reset-password?token=${token}`);
  assert.equal(writes.mock.callCount(), 1);
});

test("unverified login sends a code; verified login goes to the home page", async () => {
  const user = { ...baseUser, passwordHash: await bcrypt.hash("LongPassword123!", 4), emailVerifiedAt: null as Date | null };
  const find = mock.method(dependencies.db.user, "findUnique", async () => user);
  mock.method(dependencies.db.user, "updateMany", async () => ({ count: 1 }));
  mock.method(bookingMailer, "sendVerification", async () => {});
  let result = await request("/login", { email: user.email, password: "LongPassword123!" });
  assert.match(result.redirect, /^\/verify-email/);
  assert.equal(result.req.session.user, undefined);
  find.mock.mockImplementation(async () => ({ ...user, emailVerifiedAt: new Date() }));
  result = await request("/login", { email: user.email, password: "LongPassword123!" });
  assert.equal(result.redirect, "/");
  assert.equal(result.req.session.user?.role, "customer");
});

test("resend cooldown does not send a second email", async () => {
  mock.method(dependencies.db.user, "findUnique", async () => ({ ...baseUser, emailVerifiedAt: null }));
  mock.method(dependencies.db.user, "updateMany", async () => ({ count: 0 }));
  const mail = mock.method(bookingMailer, "sendVerification", async () => {});
  await request("/verify-email/resend", { email: baseUser.email });
  assert.equal(mail.mock.callCount(), 0);
});

test("shared login automatically grants the configured email admin access", async () => {
  const user = { ...baseUser, email: "mandela3168@gmail.com", passwordHash: await bcrypt.hash("LongPassword123!", 4) };
  mock.method(dependencies.db.user, "findUnique", async () => user);
  for (const path of ["/login", "/admin/login"]) {
    const result = await request(path, { email: user.email, password: "LongPassword123!" });
    assert.equal(result.redirect, "/");
    assert.equal(result.req.session.user?.role, "admin");
    assert.match(result.req.session.flash?.message || "", /administrator/);
  }
});

test("database access overrides a stale admin cookie", async () => {
  mock.method(dependencies.db.user, "findUnique", async () => ({ ...baseUser, role: "admin", roleAssignedByAdmin: false }));
  const write = mock.method(dependencies.db.user, "update", async () => baseUser);
  const result = await request(`/admin/users/${customerId}/role`, { role: "admin" }, true);
  assert.equal(result.redirect, "/login");
  assert.equal(write.mock.callCount(), 0);
});

test("verified owner can grant and revoke a verified user's role", async () => {
  mock.method(dependencies.db.user, "findUnique", async ({ where }: { where: { id: string } }) => where.id === ownerId ? { ...baseUser, id: ownerId, email: "mandela3168@gmail.com" } : baseUser);
  const write = mock.method(dependencies.db.user, "update", async () => baseUser);
  await request(`/admin/users/${customerId}/role`, { role: "admin" }, true);
  await request(`/admin/users/${customerId}/role`, { role: "customer" }, true);
  assert.deepEqual(write.mock.calls.map((call) => call.arguments[0]!.data), [{ role: "admin", roleAssignedByAdmin: true }, { role: "customer", roleAssignedByAdmin: false }]);
});

test("MAIL settings work; client alerts go to both owners and codes to the client", async () => {
  const messages: { to: unknown; text: string }[] = [];
  mock.method(nodemailer, "createTransport", () => ({ sendMail: async (message: { to: unknown; text: string }) => { messages.push(message); return { accepted: ["one@example.com", "two@example.com"] }; } }));
  const mailer = createBookingMailer({ MAIL_HOST: "smtp.example.com", MAIL_PORT: "465", MAIL_USERNAME: "sender@example.com", MAIL_PASSWORD: "test-only", ADMIN_EMAILS: "one@example.com,two@example.com" });
  assert.equal(mailer.configured, true);
  await mailer.notifyInquiry({ id: "123456", requesterEmail: baseUser.email, message: "Hello" });
  await mailer.notifyOrder({ id: "123456", requesterEmail: baseUser.email });
  await mailer.notifyApprover({ id: "123456", requesterEmail: baseUser.email, eventDate: new Date() });
  await mailer.sendVerification(baseUser.email, "123456");
  for (const message of messages.slice(0, 3)) assert.deepEqual(message.to, [{ address: "one@example.com" }, { address: "two@example.com" }]);
  assert.deepEqual(messages[3].to, { address: baseUser.email });
});
