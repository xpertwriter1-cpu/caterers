const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ejs = require("ejs");
const { createBookingMailer, isEmail } = require("../booking-email");
const { createAdminNotifier } = require("../admin-notifications");
const source = fs.readFileSync(require.resolve("../server"), "utf8");
const inquiry = { _id: "123456", requesterName: "Client", requesterEmail: "client@example.com", subject: "Equipment hire", message: "Please quote for tables.\nFor Saturday.", createdAt: new Date() };

test("contact enquiries are saved before notification; failed channels preserve requests", async () => {
  for (const email of ["Accepted", "Failed", "Not configured"]) {
    let handler, saved, saves = 0, redirected, flashed;
    vm.runInNewContext(source.slice(source.indexOf('app.post("/contact"'), source.indexOf('app.get("/register"')), {
      app: { post(path, callback) { handler = callback; } }, isEmail,
      Inquiry: { create: async data => { saved = { ...data, _id: inquiry._id, save: async () => { saves++; } }; return saved; } },
      adminNotifier: { notify: async (kind, record) => { assert.equal(kind, "inquiry"); assert.equal(record, saved); return { email, whatsapp: "Failed" }; } },
      flash(req, type) { flashed = type; }
    });
    await handler({ body: { name: " Client ", email: "CLIENT@example.com", subject: inquiry.subject, message: inquiry.message } }, { redirect(path) { redirected = path; } }, error => { throw error; });
    assert.equal(saved.requesterName, "Client");
    assert.equal(saved.requesterEmail, inquiry.requesterEmail);
    assert.equal(saved.adminNotifications.email, email);
    assert.equal(saves, 1);
    assert.equal(redirected, "/contact");
    assert.equal(flashed, "success");
    for (const invalid of [{ email: "bad" }, { name: " " }, { message: " " }, { message: "x".repeat(3001) }, { email: [inquiry.requesterEmail] }, { subject: { $ne: null } , message: "" }]) {
      saved = undefined;
      await handler({ body: { name: "Client", email: inquiry.requesterEmail, message: inquiry.message, ...invalid } }, { redirect() {} }, error => { throw error; });
      assert.equal(saved, undefined);
      assert.equal(flashed, "danger");
    }
  }
});

test("enquiry alerts use admin recipients and approved template; retry skips accepted WhatsApp", async () => {
  const nodemailer = require("nodemailer");
  const original = nodemailer.createTransport;
  let mail, body, calls = 0, rejectEmail = true;
  nodemailer.createTransport = () => ({ sendMail: async message => {
    mail = message;
    if (rejectEmail) throw Error("SMTP unavailable");
    return { accepted: [message.to.address] };
  } });
  try {
    const env = { SMTP_HOST: "smtp.example.com", SMTP_USER: "business@example.com", SMTP_PASS: "test",
      ADMIN_NOTIFICATION_EMAIL: "admin@example.com", ADMIN_WHATSAPP_NUMBER: "+254700000000",
      TWILIO_ACCOUNT_SID: "AC" + "1".repeat(32), TWILIO_AUTH_TOKEN: "test", TWILIO_WHATSAPP_FROM: "+15555555555",
      TWILIO_WHATSAPP_CONTENT_SID: "HX" + "2".repeat(32), PUBLIC_BASE_URL: "https://caterer.example.com" };
    const notifier = createAdminNotifier({ env, mailer: createBookingMailer(env), fetchImpl: async (url, options) => {
      calls++; body = options.body;
      return { ok: true, json: async () => ({ sid: "SM123", status: "queued" }) };
    } });
    const record = { ...inquiry };
    record.adminNotifications = await notifier.notify("inquiry", record);
    assert.equal(record.adminNotifications.email, "Failed");
    assert.equal(record.adminNotifications.whatsapp, "Accepted");
    rejectEmail = false;
    const retried = await notifier.notify("inquiry", record, true);
    assert.equal(retried.email, "Accepted");
    assert.equal(retried.whatsappMessageId, "SM123");
    assert.equal(calls, 1);
    assert.equal(mail.to.address, env.ADMIN_NOTIFICATION_EMAIL);
    assert.equal(mail.replyTo.address, inquiry.requesterEmail);
    assert.ok(mail.text.includes(inquiry.message));
    const variables = JSON.parse(body.get("ContentVariables"));
    assert.equal(variables["1"], "Contact enquiry");
    assert.ok(variables["3"].includes(inquiry.subject));
    assert.ok(!variables["3"].includes("\n"));
    assert.equal(variables["4"], "https://caterer.example.com/admin");
  } finally { nodemailer.createTransport = original; }
});

test("admins can retry enquiry alerts through the authenticated retry route", async () => {
  let handler, saved = false, guarded = false;
  const record = { ...inquiry, save: async () => { saved = true; } };
  const requireAdmin = () => {};
  vm.runInNewContext(source.slice(source.indexOf('app.post("/admin/notifications/'), source.indexOf('app.post("/admin/services"')), {
    app: { post(path, auth, callback) { guarded = auth === requireAdmin; handler = callback; } }, requireAdmin,
    mongoose: { isValidObjectId: () => true }, Inquiry: { findById: async () => record },
    adminNotifier: { notify: async (kind, data, retry) => { assert.equal(kind, "inquiry"); assert.equal(data, record); assert.equal(retry, true); return { email: "Accepted", whatsapp: "Accepted" }; } }, flash() {}
  });
  await handler({ params: { kind: "inquiry", id: inquiry._id } }, { redirect(path) { assert.equal(path, "/admin"); } }, error => { throw error; });
  assert.ok(guarded);
  assert.ok(saved);
});

test("admin dashboard escapes enquiry messages and offers alert retries", async () => {
  const html = await ejs.renderFile("views/admin.ejs", { title: "Admin", currentUser: null, flash: null, year: 2026,
    stats: {}, services: [], customers: 0, bookings: [], orders: [], currency: () => "KES 0",
    inquiries: [{ ...inquiry, message: '<script>alert("test")</script>', adminNotifications: { email: "Failed", whatsapp: "Accepted" } }] });
  assert.ok(html.includes("Client enquiries"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes('<script>alert("test")</script>'));
  assert.ok(html.includes("/admin/notifications/inquiry/123456/retry"));
  assert.ok(html.includes("mailto:client@example.com"));
});
