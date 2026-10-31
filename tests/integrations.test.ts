import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { createBookingMailer, isEmail } from "../src/lib/booking-email";
import { createAdminNotifier } from "../src/lib/admin-notifications";
import { createPayments } from "../src/lib/payments";
import type { Environment, NotificationRecord } from "../src/lib/types";

afterEach(() => mock.restoreAll());
const env: Environment = {
  SMTP_HOST: "smtp.example.com",
  SMTP_USER: "business@example.com",
  SMTP_PASS: "test",
  ADMIN_NOTIFICATION_EMAIL: "admin@example.com",
  ADMIN_WHATSAPP_NUMBER: "+254723548397",
  TWILIO_ACCOUNT_SID: "AC" + "1".repeat(32),
  TWILIO_AUTH_TOKEN: "test",
  TWILIO_WHATSAPP_FROM: "+15555555555",
  TWILIO_WHATSAPP_CONTENT_SID: "HX" + "2".repeat(32),
  PUBLIC_BASE_URL: "https://caterer.example.com",
};
const order: NotificationRecord = {
  _id: "123456",
  requesterName: "Guest",
  requesterEmail: "guest@example.com",
  phone: "0723548397",
  items: [{ name: "Pilau\nmeal", quantity: 20 }],
  total: 5500,
  deliveryFee: 500,
  quoted: true,
  paymentReference: "ref-1",
  paymentMethod: "M-PESA",
  accessToken: "a".repeat(64),
  status: "Confirmed",
  paymentStatus: "Pending",
  deliveryAddress: "Nairobi",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("orders, event bookings and contact enquiries send admin email and templated WhatsApp alerts", async () => {
  const messages: Mail.Options[] = [];
  mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (message: Mail.Options) => {
      messages.push(message);
      return { accepted: ["admin@example.com"] };
    },
  }));
  const bodies: URLSearchParams[] = [];
  const notifier = createAdminNotifier({
    env,
    mailer: createBookingMailer(env),
    fetchImpl: async (_url, options) => {
      bodies.push(options?.body as URLSearchParams);
      return json({ sid: "SM123", status: "queued" });
    },
  });
  const booking: NotificationRecord = {
    _id: "123456",
    requesterName: "Guest",
    requesterEmail: "guest@example.com",
    type: "Wedding",
    guestCount: 100,
    eventDate: "2099-01-01",
    venue: "Nairobi",
  };
  const inquiry: NotificationRecord = {
    _id: "123456",
    requesterName: "Guest",
    requesterEmail: "guest@example.com",
    subject: "Equipment hire",
    message: "Please quote.\nFor tables.",
  };
  for (const [kind, record] of [
    ["order", order],
    ["booking", booking],
    ["inquiry", inquiry],
  ] as const) {
    const result = await notifier.notify(kind, record);
    assert.equal(result.email, "Accepted");
    assert.equal(result.whatsapp, "Accepted");
    assert.equal(result.whatsappMessageId, "SM123");
  }
  for (const message of messages) {
    assert.deepEqual(message.to, { address: "admin@example.com" });
    assert.deepEqual(message.replyTo, { address: "guest@example.com" });
    assert.ok(!String(message.text).includes(order.accessToken!));
  }
  assert.ok(String(messages[2].text).includes(inquiry.message!));
  assert.equal(bodies[0].get("To"), "whatsapp:+254723548397");
  assert.equal(bodies[0].get("ContentSid"), env.TWILIO_WHATSAPP_CONTENT_SID);
  assert.equal(bodies[0].get("Body"), null);
  const vars = JSON.parse(bodies[0].get("ContentVariables")!);
  assert.equal(vars["3"], "Pilau meal x 20");
  assert.equal(vars["4"], "https://caterer.example.com/admin");
  assert.equal(
    JSON.parse(bodies[2].get("ContentVariables")!)["1"],
    "Contact enquiry",
  );
});

test("email failure does not prevent WhatsApp; retry skips accepted channels", async () => {
  let emails = 0,
    whatsapp = 0;
  const notifier = createAdminNotifier({
    env,
    mailer: {
      configured: true,
      notifyApprover: async () => {
        emails++;
        if (emails === 1) throw Error("SMTP down");
      },
    },
    fetchImpl: async () => {
      whatsapp++;
      return json({ sid: "SM123" });
    },
  });
  const booking: NotificationRecord = {
    _id: "123456",
    type: "Wedding",
    guestCount: 100,
  };
  booking.adminNotifications = await notifier.notify("booking", booking);
  assert.equal(booking.adminNotifications.email, "Failed");
  assert.equal(booking.adminNotifications.whatsapp, "Accepted");
  const result = await notifier.notify("booking", booking, true);
  assert.equal(result.email, "Accepted");
  assert.equal(result.whatsappMessageId, "SM123");
  assert.equal(emails, 2);
  assert.equal(whatsapp, 1);
});

test("WhatsApp provider/network errors preserve successful email and missing configuration sends nothing", async () => {
  for (const fetchImpl of [
    async () => {
      throw Error("timeout");
    },
    async () => json({ message: "Rejected" }, 400),
    async () => json({ sid: "SM123", status: "failed" }),
  ]) {
    const notifier = createAdminNotifier({
      env,
      mailer: { configured: true, notifyOrder: async () => {} },
      fetchImpl,
    });
    const result = await notifier.notify("order", order);
    assert.equal(result.email, "Accepted");
    assert.equal(result.whatsapp, "Failed");
  }
  const empty = createAdminNotifier({
    env: {},
    mailer: { configured: false },
    fetchImpl: async () => assert.fail("Must not send"),
  });
  const result = await empty.notify("order", order);
  assert.equal(result.email, "Not configured");
  assert.equal(result.whatsapp, "Not configured");
  for (const change of [
    { ADMIN_WHATSAPP_NUMBER: "0723548397" },
    { PUBLIC_BASE_URL: "http://localhost:3001" },
    { TWILIO_WHATSAPP_CONTENT_SID: "" },
  ]) {
    assert.equal(
      createAdminNotifier({
        env: { ...env, ...change },
        mailer: { configured: true },
      }).configured.whatsapp,
      false,
    );
  }
});

test("booking decisions use requester email and exclude internal notes", async () => {
  let message: Mail.Options | undefined;
  mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (m: Mail.Options) => {
      message = m;
      return { accepted: ["guest@example.com"] };
    },
  }));
  const mailer = createBookingMailer(env);
  await mailer.send(
    {
      _id: "123456",
      type: "Wedding",
      eventDate: "2099-01-01",
      status: "Approved",
      approverComment: "Welcome!",
    },
    "guest@example.com",
  );
  assert.ok(message);
  assert.deepEqual(message.to, { address: "guest@example.com" });
  assert.ok(String(message.text).includes("Welcome!"));
  assert.ok(!String(message.text).includes("Sign in"));
});

test("email validation rejects address injection", () => {
  for (const value of ["person@gmail.com", "person@example.co.ke"])
    assert.equal(isEmail(value), true);
  for (const value of [
    "bad",
    "a@example.com,b@example.com",
    "a@example.com\r\nBcc:b@example.com",
    undefined,
  ])
    assert.equal(isEmail(value), false);
});

test("Paystack initializes from stored totals and verifies reference, currency, amount and email", async () => {
  let body: Record<string, unknown> = {};
  let data = {
    status: "success",
    reference: "ref-1",
    currency: "KES",
    amount: 550000,
    customer: { email: order.requesterEmail },
  };
  const gateway = createPayments(
    { PAYSTACK_SECRET_KEY: "test", PUBLIC_BASE_URL: "https://example.com" },
    async (_url, options) => {
      if (options?.body) body = JSON.parse(String(options.body));
      return json({ status: true, data });
    },
  );
  await gateway.initialize(order);
  assert.equal(body.amount, 550000);
  assert.deepEqual(body.channels, ["mobile_money"]);
  assert.ok(String(body.callback_url).endsWith("/verify"));
  await gateway.initialize({ ...order, paymentMethod: "Card" });
  assert.deepEqual(body.channels, ["card"]);
  assert.equal(await gateway.verify(order), true);
  for (const change of [
    { amount: 1 },
    { currency: "USD" },
    { reference: "wrong" },
    { status: "pending" },
    { customer: { email: "other@example.com" } },
  ]) {
    const original = data;
    data = { ...data, ...change };
    assert.equal(await gateway.verify(order), false);
    data = original;
  }
});

test("webhook HMAC validation rejects forged and malformed signatures", () => {
  const gateway = createPayments({ PAYSTACK_SECRET_KEY: "secret" });
  const body = Buffer.from('{"event":"charge.success"}');
  const signature = crypto
    .createHmac("sha512", "secret")
    .update(body)
    .digest("hex");
  assert.equal(gateway.validSignature(body, signature), true);
  assert.equal(
    gateway.validSignature(Buffer.from("changed"), signature),
    false,
  );
  assert.equal(gateway.validSignature(body, "bad"), false);
  assert.equal(gateway.validSignature(body, undefined), false);
});
