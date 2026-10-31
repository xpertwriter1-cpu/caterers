import { afterEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { User, Booking, Order, Inquiry, Service } from "../src/lib/models";
import { adminNotifier, bookingMailer } from "../src/lib/controllers";
import { run, admin, customer, id } from "./helpers";
import type { NotificationKind, NotificationRecord } from "../src/lib/types";

afterEach(() => mock.restoreAll());

test("admin and account routes require the correct authenticated role", async () => {
  for (const path of [
    "/admin",
    `/admin/notifications/inquiry/${id}/retry`,
    "/admin/services",
    `/admin/bookings/${id}`,
    `/admin/orders/${id}`,
  ]) {
    for (const user of [undefined, customer]) {
      assert.equal(
        (await run(path === "/admin" ? "GET" : "POST", path, {}, user))
          .redirect,
        "/admin/login",
      );
    }
  }
  assert.equal((await run("GET", "/account")).redirect, "/login");
});

test("admin sign-in rejects customer accounts, rotates session and accepts administrators", async () => {
  let user = { ...admin, _id: id, passwordHash: "hash" };
  mock.method(User, "findOne", async () => user);
  mock.method(bcrypt, "compare", async () => true);
  let result = await run("POST", "/admin/login", {
    email: admin.email,
    password: "test",
  });
  assert.equal(result.redirect, "/admin");
  assert.equal(result.req.session.user?.role, "admin");
  user = { ...user, role: "customer" };
  result = await run("POST", "/admin/login", {
    email: admin.email,
    password: "test",
  });
  assert.equal(result.redirect, "/admin/login");
  assert.equal(result.req.session.user, undefined);
  assert.equal(
    (await run("POST", "/login", { email: admin.email, password: "test" }))
      .redirect,
    "/account",
  );
});

test("contact enquiries persist before email/WhatsApp attempts, including channel failures", async () => {
  for (const status of ["Accepted", "Failed", "Not configured"] as const) {
    let saved: Record<string, unknown> | undefined,
      saves = 0;
    mock.method(Inquiry, "create", async (data: Record<string, unknown>) => {
      saved = {
        ...data,
        _id: id,
        save: async () => {
          saves++;
        },
      };
      return saved;
    });
    mock.method(
      adminNotifier,
      "notify",
      async (kind: NotificationKind, record: NotificationRecord) => {
        assert.equal(kind, "inquiry");
        assert.equal(record, saved);
        return { email: status, whatsapp: "Failed" };
      },
    );
    const result = await run("POST", "/contact", {
      name: " Client ",
      email: "CLIENT@example.com",
      subject: "Tables",
      message: "Please quote.",
    });
    assert.equal(saved?.requesterEmail, "client@example.com");
    assert.equal(saves, 1);
    assert.equal(result.redirect, "/contact");
    assert.equal(result.req.session.flash?.type, "success");
    mock.restoreAll();
  }
});

test("contact form rejects invalid and oversized submissions without storing or sending", async () => {
  mock.method(Inquiry, "create", () =>
    assert.fail("Invalid enquiry must not be saved"),
  );
  for (const bad of [
    { email: "bad" },
    { name: " " },
    { message: " " },
    { message: "x".repeat(3001) },
    { subject: "x".repeat(151) },
  ] as Record<string, string>[]) {
    const result = await run("POST", "/contact", {
      name: "Client",
      email: "client@example.com",
      message: "Help",
      ...bad,
    });
    assert.equal(result.req.session.flash?.type, "danger");
  }
});

test("guest booking saves and alerts both channels without requiring an account", async () => {
  let created: Record<string, unknown> | undefined;
  mock.method(Booking, "create", async (data: Record<string, unknown>) => {
    created = { ...data, _id: id, save: async () => {} };
    return created;
  });
  mock.method(adminNotifier, "notify", async (kind: NotificationKind) => {
    assert.equal(kind, "booking");
    return { email: "Failed", whatsapp: "Accepted" };
  });
  const result = await run("POST", "/book", {
    requesterName: "Guest",
    requesterEmail: "guest@example.com",
    type: "Wedding",
    eventDate: "2099-01-01",
    guestCount: "50",
    venue: "Nairobi",
  });
  assert.equal(created?.customer, undefined);
  assert.equal(created?.approverNotificationStatus, "Failed");
  assert.equal(result.redirect, "/book");
  assert.equal(result.req.session.flash?.type, "success");
});

test("guest food request uses database prices, generates a private token and sends alerts", async () => {
  let created: Record<string, unknown> | undefined;
  mock.method(Service, "findOne", async () => ({
    _id: id,
    name: "Pilau",
    price: 200,
    quoteOnly: false,
  }));
  mock.method(Order, "create", async (data: Record<string, unknown>) => {
    created = { ...data, _id: id, save: async () => {} };
    return created;
  });
  mock.method(adminNotifier, "notify", async (kind: NotificationKind) => {
    assert.equal(kind, "order");
    return { email: "Accepted", whatsapp: "Not configured" };
  });
  const result = await run("POST", `/order/${id}`, {
    requesterName: "Guest",
    requesterEmail: "guest@example.com",
    phone: "0723548397",
    quantity: "20",
    deliveryAddress: "Nairobi",
    paymentMethod: "M-PESA",
    total: "1",
  });
  assert.equal(created?.total, 4000);
  assert.match(String(created?.accessToken), /^[a-f0-9]{64}$/);
  assert.equal(result.redirect, "/requests/" + created?.accessToken);
});

test("unpaid orders cannot be prepared/dispatched and admins cannot mark payment Paid", async () => {
  for (const status of [
    "Preparing",
    "Ready for dispatch",
    "Out for delivery",
    "Delivered",
    "Confirmed",
  ]) {
    let saves = 0;
    const record = {
      status: "Received",
      paymentStatus: "Pending",
      save: async () => {
        saves++;
      },
    };
    mock.method(Order, "findById", () => ({ populate: async () => record }));
    await run(
      "POST",
      `/admin/orders/${id}`,
      { status, paymentStatus: "Paid" },
      admin,
    );
    assert.equal(saves, status === "Confirmed" ? 1 : 0);
    assert.equal(record.paymentStatus, "Pending");
    mock.restoreAll();
  }
});

test("checkout locks prevent administrators from changing an initiated quotation", async () => {
  const record = {
    status: "Confirmed",
    paymentStatus: "Pending",
    paymentReference: "ref",
    total: 5000,
    deliveryFee: 500,
    save: async () => {},
  };
  mock.method(Order, "findById", () => ({ populate: async () => record }));
  await run(
    "POST",
    `/admin/orders/${id}`,
    { status: "Confirmed", foodTotal: "1", deliveryFee: "0" },
    admin,
  );
  assert.equal(record.total, 5000);
  assert.equal(record.deliveryFee, 500);
});

test("rescheduling requires a date and comment; failed requester emails preserve review", async () => {
  let saves = 0;
  const record = {
    _id: id,
    customer: { email: "legacy@example.com" },
    status: "New",
    approverComment: "",
    emailStatus: "Not sent",
    save: async () => {
      saves++;
    },
  };
  mock.method(Booking, "findById", () => ({ populate: async () => record }));
  await run(
    "POST",
    `/admin/bookings/${id}`,
    { status: "Reschedule Requested" },
    admin,
  );
  assert.equal(saves, 0);
  await run(
    "POST",
    `/admin/bookings/${id}`,
    {
      status: "Reschedule Requested",
      proposedDate: "2099-01-01",
      approverComment: "Please confirm",
    },
    admin,
  );
  assert.equal(record.status, "Reschedule Requested");
  assert.equal(saves, 1);
  mock.property(bookingMailer, "configured", true);
  mock.method(
    bookingMailer,
    "send",
    async (_booking: NotificationRecord, recipient: string) => {
      assert.equal(recipient, "legacy@example.com");
      throw Error("SMTP unavailable");
    },
  );
  await run(
    "POST",
    `/admin/bookings/${id}`,
    { status: "Approved", approverComment: "Welcome", sendEmail: "on" },
    admin,
  );
  assert.equal(record.approverComment, "Welcome");
  assert.equal(record.emailStatus, "Failed");
});

test("authenticated admins retry enquiries; invalid ids and kinds return 404", async () => {
  let saves = 0;
  const record = {
    _id: id,
    save: async () => {
      saves++;
    },
  };
  mock.method(Inquiry, "findById", async () => record);
  mock.method(
    adminNotifier,
    "notify",
    async (
      kind: NotificationKind,
      data: NotificationRecord,
      retry: boolean,
    ) => {
      assert.equal(kind, "inquiry");
      assert.equal(data, record);
      assert.equal(retry, true);
      return { email: "Accepted", whatsapp: "Accepted" };
    },
  );
  assert.equal(
    (await run("POST", `/admin/notifications/inquiry/${id}/retry`, {}, admin))
      .redirect,
    "/admin",
  );
  assert.equal(saves, 1);
  assert.equal(
    (await run("POST", `/admin/notifications/unknown/${id}/retry`, {}, admin))
      .status,
    404,
  );
  assert.equal(
    (await run("POST", "/admin/notifications/inquiry/bad/retry", {}, admin))
      .status,
    404,
  );
});
