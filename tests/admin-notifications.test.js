const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createAdminNotifier } = require("../admin-notifications");
const { createBookingMailer } = require("../booking-email");
const env = {
  ADMIN_NOTIFICATION_EMAIL: "admin@example.com", ADMIN_WHATSAPP_NUMBER: "+254723548397",
  TWILIO_ACCOUNT_SID: "AC" + "1".repeat(32), TWILIO_AUTH_TOKEN: "test-token",
  TWILIO_WHATSAPP_CONTENT_SID: "HX" + "2".repeat(32), TWILIO_WHATSAPP_FROM: "+15555555555",
  PUBLIC_BASE_URL: "https://caterer.example.com"
};
const order = { _id: "123456", requesterEmail: "client@example.com", requesterName: "Client", phone: "+254700000000",
  items: [{ name: "Pilau\nmeal", quantity: 10 }], deliveryAddress: "Nairobi", accessToken: "PRIVATE-TOKEN" };

test("order alerts send to admin email and approved WhatsApp template without private checkout links", async () => {
  const nodemailer = require("nodemailer");
  const original = nodemailer.createTransport;
  let message, request;
  nodemailer.createTransport = () => ({ sendMail: async m => { message = m; return { accepted: [m.to.address] }; } });
  try {
    const notifier = createAdminNotifier({
      env, mailer: createBookingMailer({ ...env, SMTP_HOST: "smtp.example.com", SMTP_USER: "business@example.com", SMTP_PASS: "test" }),
      fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ sid: "SM123", status: "queued" }) }; }
    });
    const result = await notifier.notify("order", order);
    assert.equal(result.email, "Accepted");
    assert.equal(result.whatsapp, "Accepted");
    assert.equal(result.whatsappMessageId, "SM123");
    assert.equal(message.to.address, env.ADMIN_NOTIFICATION_EMAIL);
    assert.equal(message.replyTo.address, order.requesterEmail);
    assert.ok(message.subject.startsWith("New order / quotation request"));
    assert.ok(!message.text.includes(order.accessToken));
    assert.ok(message.text.includes("/admin"));
    const body = request.options.body;
    assert.equal(body.get("To"), "whatsapp:+254723548397");
    assert.equal(body.get("ContentSid"), env.TWILIO_WHATSAPP_CONTENT_SID);
    assert.equal(body.get("Body"), null);
    const vars = JSON.parse(body.get("ContentVariables"));
    assert.equal(vars["3"], "Pilau meal x 10");
    assert.equal(vars["4"], "https://caterer.example.com/admin");
    assert.ok(!body.toString().includes(order.accessToken));
  } finally { nodemailer.createTransport = original; }
});

test("email failure does not prevent WhatsApp; retries skip already accepted channels", async () => {
  let emails = 0, whatsapp = 0;
  const notifier = createAdminNotifier({ env,
    mailer: { configured: true, notifyApprover: async () => { emails++; if (emails === 1) throw Error("SMTP down"); } },
    fetchImpl: async () => { whatsapp++; return { ok: true, json: async () => ({ sid: "SM123" }) }; }
  });
  const booking = { _id: "123456", type: "Wedding", guestCount: 100 };
  booking.adminNotifications = await notifier.notify("booking", booking);
  assert.equal(booking.adminNotifications.email, "Failed");
  assert.equal(booking.adminNotifications.whatsapp, "Accepted");
  const retried = await notifier.notify("booking", booking, true);
  assert.equal(retried.email, "Accepted");
  assert.equal(retried.whatsappMessageId, "SM123");
  assert.equal(emails, 2);
  assert.equal(whatsapp, 1);
});

test("WhatsApp network and provider errors are recorded while email succeeds", async () => {
  for (const fetchImpl of [async () => { throw Error("timeout"); }, async () => ({ ok: false, json: async () => ({ message: "Rejected" }) }),
    async () => ({ ok: true, json: async () => ({ sid: "SM123", status: "failed" }) })]) {
    const notifier = createAdminNotifier({ env, mailer: { configured: true, notifyOrder: async () => {} }, fetchImpl });
    const result = await notifier.notify("order", order);
    assert.equal(result.email, "Accepted");
    assert.equal(result.whatsapp, "Failed");
  }
});

test("missing configuration never sends; invalid recipient and insecure URL disable WhatsApp", async () => {
  const notifier = createAdminNotifier({ env: {}, mailer: { configured: false }, fetchImpl: () => assert.fail("must not send") });
  const result = await notifier.notify("order", order);
  assert.equal(result.email, "Not configured");
  assert.equal(result.whatsapp, "Not configured");
  for (const change of [{ ADMIN_WHATSAPP_NUMBER: "0723548397" }, { PUBLIC_BASE_URL: "http://localhost:3000" }, { TWILIO_WHATSAPP_CONTENT_SID: "" }]) {
    assert.equal(createAdminNotifier({ env: { ...env, ...change }, mailer: { configured: true } }).configured.whatsapp, false);
  }
});
