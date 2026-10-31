const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ejs = require("ejs");

const source = fs.readFileSync(require.resolve("../server"), "utf8");

test("admin login accepts administrators and rejects customer accounts", async () => {
  let adminLogin;
  const app = {
    get() {},
    post(path, handler) {
      if (path === "/admin/login") adminLogin = handler;
    }
  };
  let user = { _id: "admin-id", name: "Admin", email: "admin@example.com", role: "admin", passwordHash: "hash" };
  vm.runInNewContext(source.slice(source.indexOf('app.get("/login"'), source.indexOf('app.post("/logout"')), {
    app,
    User: { findOne: async () => user },
    bcrypt: { compare: async () => true },
    flash() {}
  });

  let destination;
  const req = { body: { email: "admin@example.com", password: "secret" }, session: { regenerate: callback => callback(null) } };
  const res = { redirect: path => { destination = path; } };
  await adminLogin(req, res, error => { throw error; });
  assert.equal(destination, "/admin");
  assert.equal(req.session.user.role, "admin");

  user = { ...user, role: "customer" };
  destination = undefined;
  await adminLogin({ ...req, session: { regenerate() { assert.fail("customer must not get a session"); } } }, res, error => { throw error; });
  assert.equal(destination, "/admin/login");
});

test("sign-in page shows admin access and guest booking options", async () => {
  const locals = { title: "Sign In", mode: "login", audience: "guest", currentUser: null, flash: null, year: 2026 };
  const html = await ejs.renderFile("views/auth.ejs", locals);
  assert.ok(html.includes('href="/admin/login"'));
  assert.ok(html.includes("Continue as a guest"));
  assert.ok(html.includes('href="/book"'));
  assert.ok(html.includes('href="/services"'));
  assert.equal((html.match(/src="\/images\/nanny-events-logo\.png"/g) || []).length, 2);
  assert.ok(fs.existsSync("public/images/nanny-events-logo.png"));

  const adminHtml = await ejs.renderFile("views/auth.ejs", { ...locals, audience: "admin", title: "Admin Sign In" });
  assert.ok(adminHtml.includes('action="/admin/login"'));
  assert.ok(adminHtml.includes("Sign in to review bookings, manage food orders and update services."));
});
