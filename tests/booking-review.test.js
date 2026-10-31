const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ejs = require("ejs");
const { isEmail, createBookingMailer } = require("../booking-email");
const source = fs.readFileSync(require.resolve("../server"), "utf8");
const statuses = vm.runInNewContext(source.match(/const bookingStatuses = (.*);/)[1]);

test("guests submit bookings without an account; notification failures preserve booking", async () => {
  for (const fail of [false, true]) {
    let handler, saved, redirected, notified = 0;
    const context = {
      app: { post: (path, callback) => { handler = callback; } }, isEmail,
      Booking: { create: async data => { saved = { ...data, _id: "123456", save: async () => {} }; return saved; } },
      adminNotifier: { notify: async (kind, b) => { notified++; assert.equal(kind, "booking"); assert.equal(b.requesterEmail, "guest@gmail.com"); return { email: fail ? "Failed" : "Accepted", whatsapp: "Not configured" }; } },
      flash() {}
    };
    vm.runInNewContext(source.slice(source.indexOf('app.post("/book",'), source.indexOf('app.get("/order/:id"')), context);
    const body = { requesterName:"Guest", requesterEmail:"Guest@gmail.com", type:"Wedding", eventDate:"2099-01-01", guestCount:"100", venue:"Nairobi" };
    await handler({body,session:{}}, {redirect: path => {redirected = path;}}, error => {throw error;});
    assert.equal(saved.customer, undefined);
    assert.equal(saved.requesterName, "Guest");
    assert.equal(saved.approverNotificationStatus, fail ? "Failed" : "Sent");
    assert.equal(redirected, "/book");
    assert.equal(notified, 1);
    saved = undefined;
    await handler({body:{...body,requesterEmail:"invalid"},session:{}}, {redirect(){}}, error => {throw error;});
    assert.equal(saved, undefined);
  }
});

test("approver notifications and decisions use the correct email recipients without account links", async () => {
  const nodemailer = require("nodemailer");
  const original = nodemailer.createTransport;
  const messages = [];
  nodemailer.createTransport = () => ({sendMail: async message => {messages.push(message); return {accepted:[message.to.address]};}});
  try {
    const mailer = createBookingMailer({SMTP_HOST:"smtp.example.com",SMTP_USER:"business@example.com",SMTP_PASS:"test-only",BOOKING_APPROVER_EMAIL:"approver@example.com"});
    const booking = {_id:"123456",requesterName:"Guest",requesterEmail:"guest@gmail.com",type:"Wedding",eventDate:new Date(),status:"Approved",approverComment:"Approved!",adminNotes:"PRIVATE"};
    await mailer.notifyApprover(booking);
    await mailer.send(booking, booking.requesterEmail);
    assert.equal(messages[0].to.address,"approver@example.com");
    assert.equal(messages[0].replyTo.address,"guest@gmail.com");
    assert.equal(messages[1].to.address,"guest@gmail.com");
    assert.ok(messages[1].text.includes("Approved!"));
    assert.ok(!messages[1].text.includes("Please sign in"));
    assert.ok(!messages[1].text.includes("PRIVATE"));
  } finally {nodemailer.createTransport = original;}
});

async function review(body, options = {}) {
  let handler, sends = 0, saves = 0, message;
  const booking = { _id: "123456", customer: { email: "legacy@gmail.com" }, status: "New", save: async () => { saves++; } };
  const context = {
    app: { post: (path, auth, callback) => { handler = callback; } }, requireAdmin() {},
    Booking: { findById: () => ({ populate: async () => booking }) },
    bookingStatuses: statuses, isEmail,
    bookingMailer: { configured: options.configured !== false, send: async (b, recipient) => {
      sends++; assert.equal(recipient, "legacy@gmail.com");
      if (options.fail) throw new Error("SMTP failure");
    } },
    flash: (req, type, text) => { message = { type, text }; }
  };
  vm.runInNewContext(source.slice(source.indexOf('app.post("/admin/bookings/:id"'), source.indexOf('app.post("/admin/orders/:id"')), context);
  await handler({ params: { id: "123456" }, body }, { redirect() {} }, error => { throw error; });
  return { booking, sends, saves, message };
}

test("approval comments save without email; internal notes remain separate", async () => {
  const r = await review({ status: "Approved", approverComment: "Welcome!", adminNotes: "Private" });
  assert.equal(r.booking.approverComment, "Welcome!");
  assert.equal(r.booking.adminNotes, "Private");
  assert.equal(r.booking.emailStatus, "Not sent");
  assert.equal(r.sends, 0);
  assert.equal(r.saves, 1);
});
test("rescheduling requires both proposed date and comments", async () => {
  for (const body of [{ status: "Reschedule Requested" }, { status: "Reschedule Requested", proposedDate: "2099-01-01" }]) {
    assert.equal((await review(body)).saves, 0);
  }
  const r = await review({ status: "Reschedule Requested", proposedDate: "2099-01-01", approverComment: "Please confirm this date", sendEmail: "on" });
  assert.equal(r.booking.emailStatus, "Sent");
  assert.ok(r.booking.proposedDate);
  assert.equal(r.sends, 1);
});
test("email failure preserves comments and allows retry; legacy account email works", async () => {
  const r = await review({ status: "Accepted", approverComment: "Accepted", sendEmail: "on" }, { fail: true });
  assert.equal(r.booking.approverComment, "Accepted");
  assert.equal(r.booking.emailStatus, "Failed");
  assert.equal(r.message.type, "warning");
});
test("unconfigured email and invalid updates do not save or send", async () => {
  assert.equal((await review({ status: "Approved", sendEmail: "on" }, { configured: false })).saves, 0);
  for (const body of [{status:"Unknown"}, {status:"Approved",quoteAmount:"bad"}, {status:"Approved",approverComment:"x".repeat(3001)}]) {
    const r = await review(body);
    assert.equal(r.saves, 0); assert.equal(r.sends, 0);
  }
});
test("email validation accepts Gmail and other providers, rejects recipient injection", async () => {
  assert.ok(isEmail("client@gmail.com")); assert.ok(isEmail("client@example.com"));
  assert.ok(!isEmail("bad")); assert.ok(!isEmail("a@gmail.com,b@gmail.com"));
  assert.ok(!isEmail("a@gmail.com\r\nBcc:b@gmail.com"));
  await assert.rejects(createBookingMailer({}).send({}, "client@gmail.com"));
});
test("booking views render old and reviewed bookings and escape public comments", async () => {
  const booking = { _id:"123456", type:"Wedding", eventDate:new Date(), venue:"Thika", guestCount:200, status:"Approved", approverComment:"<script>bad</script>", adminNotes:"PRIVATE-NOTE", customer:{name:"Client",email:"client@gmail.com"} };
  const locals = { title:"Test", currentUser:{name:"Client",email:"client@gmail.com"}, flash:null, year:2026, currency:String, bookings:[booking], orders:[], services:[], customers:1, stats:{}, bookingStatuses:statuses, emailConfigured:false };
  for (const file of ["book", "account", "admin"]) {
    const html = await ejs.renderFile(`views/${file}.ejs`, locals);
    if (file === "account") { assert.ok(html.includes("&lt;script&gt;")); assert.ok(!html.includes("PRIVATE-NOTE")); }
    if (file === "admin") assert.ok(html.includes("Save and email requester"));
  }
  delete booking.approverComment;
  assert.ok((await ejs.renderFile("views/account.ejs", locals)).includes("Awaiting review"));
});
