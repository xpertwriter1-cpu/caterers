import { afterEach, beforeEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma, assertAtlasUrl } from "../src/lib/prisma";
import {
  adminNotifier,
  bookingMailer,
  dependencies,
} from "../src/lib/controllers";
import { run, admin, customer, id } from "./helpers";
import type { NotificationKind, NotificationRecord } from "../src/lib/types";

const unmocked = async () => {
  throw Error("Unmocked database call");
};
const store = {
  user: { findUnique: unmocked, create: unmocked },
  service: {
    findFirst: unmocked,
    findUnique: unmocked,
    create: unmocked,
    update: unmocked,
    findMany: unmocked,
  },
  booking: {
    create: unmocked,
    update: unmocked,
    findUnique: unmocked,
    findMany: unmocked,
    count: unmocked,
  },
  order: {
    create: unmocked,
    update: unmocked,
    updateMany: unmocked,
    findUnique: unmocked,
    findFirst: unmocked,
    findMany: unmocked,
    count: unmocked,
    aggregate: unmocked,
  },
  inquiry: {
    create: unmocked,
    update: unmocked,
    findUnique: unmocked,
    findMany: unmocked,
  },
};
function resetDatabase() {
  mock.restoreAll();
  mock.property(dependencies, "db", store as unknown as typeof prisma);
}
beforeEach(resetDatabase);
afterEach(() => mock.restoreAll());
test("admin and account routes require the correct authenticated role", async () => {
  for (const path of [
    "/admin",
    `/admin/notifications/inquiry/${id}/retry`,
    "/admin/services",
    `/admin/bookings/${id}`,
    `/admin/orders/${id}`,
  ]) {
    for (const user of [undefined, customer])
      assert.equal(
        (await run(path === "/admin" ? "GET" : "POST", path, {}, user))
          .redirect,
        "/admin/login",
      );
  }
  assert.equal((await run("GET", "/account")).redirect, "/login");
});
test("Prisma connections require an Atlas SRV URL with a database", () => {
  assert.doesNotThrow(() =>
    assertAtlasUrl("mongodb+srv://user:password@cluster.mongodb.net/catering"),
  );
  for (const uri of [
    "mongodb://localhost/catering",
    "postgresql://localhost/db",
    "mongodb+srv://user:password@cluster.mongodb.net/",
  ])
    assert.throws(() => assertAtlasUrl(uri));
});
test("admin sign-in rejects customers and accepts administrators", async () => {
  let user = { ...admin, id, passwordHash: "hash" };
  mock.method(store.user, "findUnique", async () => user);
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
test("enquiries persist before notifications, with independent failed channel status", async () => {
  for (const status of ["Accepted", "Failed", "Not configured"] as const) {
    let saved: Record<string, unknown> | undefined,
      updated: Record<string, unknown> | undefined;
    mock.method(
      store.inquiry,
      "create",
      async (args: { data: Record<string, unknown> }) => {
        saved = { ...args.data, id };
        return saved;
      },
    );
    mock.method(
      store.inquiry,
      "update",
      async (args: { data: Record<string, unknown> }) => {
        updated = args.data;
        return { ...saved, ...args.data };
      },
    );
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
    assert.ok(updated?.adminNotifications);
    assert.equal(result.redirect, "/contact");
    assert.equal(result.req.session.flash?.type, "success");
    resetDatabase();
  }
});
test("invalid and oversized enquiries are never stored", async () => {
  mock.method(store.inquiry, "create", () =>
    assert.fail("Must not store invalid request"),
  );
  for (const bad of [
    { email: "bad" },
    { name: " " },
    { message: " " },
    { message: "x".repeat(3001) },
    { subject: "x".repeat(151) },
  ] as Record<string, string>[]) {
    assert.equal(
      (
        await run("POST", "/contact", {
          name: "Client",
          email: "client@example.com",
          message: "Help",
          ...bad,
        })
      ).req.session.flash?.type,
      "danger",
    );
  }
});
test("guest booking saves in Prisma and alerts the admin without requiring an account", async () => {
  let created: Record<string, unknown> | undefined,
    updated: Record<string, unknown> | undefined;
  mock.method(
    store.booking,
    "create",
    async (args: { data: Record<string, unknown> }) => {
      created = { ...args.data, id };
      return created;
    },
  );
  mock.method(
    store.booking,
    "update",
    async (args: { data: Record<string, unknown> }) => {
      updated = args.data;
      return { ...created, ...args.data };
    },
  );
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
  assert.equal(created?.customerId, undefined);
  assert.equal(updated?.approverNotificationStatus, "Failed");
  assert.equal(result.redirect, "/book");
});
test("Prisma guest food requests use stored prices and generate private tokens", async () => {
  let created: Record<string, unknown> | undefined;
  mock.method(store.service, "findFirst", async () => ({
    id,
    name: "Pilau",
    price: 200,
    quoteOnly: false,
  }));
  mock.method(
    store.order,
    "create",
    async (args: { data: Record<string, unknown> }) => {
      created = { ...args.data, id };
      return created;
    },
  );
  mock.method(store.order, "update", async () => ({}));
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
    let updates = 0;
    const order = {
      id,
      status: "Received",
      paymentStatus: "Pending",
      version: 0,
    };
    mock.method(store.order, "findUnique", async () => order);
    mock.method(
      store.order,
      "updateMany",
      async (args: { data: Record<string, unknown> }) => {
        updates++;
        assert.equal(args.data.paymentStatus, undefined);
        return { count: 1 };
      },
    );
    await run(
      "POST",
      `/admin/orders/${id}`,
      { status, paymentStatus: "Paid" },
      admin,
    );
    assert.equal(updates, status === "Confirmed" ? 1 : 0);
    assert.equal(order.paymentStatus, "Pending");
    resetDatabase();
  }
});
test("checkout locks prevent changes to initiated quotations", async () => {
  let update: Record<string, unknown> | undefined;
  mock.method(store.order, "findUnique", async () => ({
    id,
    status: "Confirmed",
    paymentStatus: "Pending",
    paymentReference: "ref",
    total: 5000,
    deliveryFee: 500,
    version: 2,
  }));
  mock.method(
    store.order,
    "updateMany",
    async (args: { data: Record<string, unknown> }) => {
      update = args.data;
      return { count: 1 };
    },
  );
  await run(
    "POST",
    `/admin/orders/${id}`,
    { status: "Confirmed", foodTotal: "1", deliveryFee: "0" },
    admin,
  );
  assert.equal(update?.total, undefined);
  assert.equal(update?.deliveryFee, undefined);
});
test("quotation updates use an atomic version and payment lock to reject concurrent checkout", async () => {
  let where: Record<string, unknown> | undefined;
  mock.method(store.order, "findUnique", async () => ({
    id,
    status: "Received",
    paymentStatus: "Pending",
    paymentReference: null,
    version: 3,
  }));
  mock.method(
    store.order,
    "updateMany",
    async (args: { where: Record<string, unknown> }) => {
      where = args.where;
      return { count: 0 };
    },
  );
  mock.method(bookingMailer, "sendOrder", () =>
    assert.fail("A stale quotation must not be emailed"),
  );
  const result = await run(
    "POST",
    `/admin/orders/${id}`,
    {
      status: "Confirmed",
      foodTotal: "4000",
      deliveryFee: "500",
      emailOrder: "on",
    },
    admin,
  );
  assert.equal(where?.version, 3);
  assert.ok(where?.OR);
  assert.deepEqual(where?.paymentStatus, { not: "Paid" });
  assert.equal(result.req.session.flash?.type, "warning");
});
test("booking reviews validate rescheduling and preserve comments when email fails", async () => {
  let updates = 0;
  const record = {
    id,
    customer: { email: "legacy@example.com" },
    status: "New",
    approverComment: "",
    emailStatus: "Not sent",
  };
  mock.method(store.booking, "findUnique", async () => record);
  mock.method(
    store.booking,
    "update",
    async (args: { data: Record<string, unknown> }) => {
      updates++;
      Object.assign(record, args.data);
      return record;
    },
  );
  await run(
    "POST",
    `/admin/bookings/${id}`,
    { status: "Reschedule Requested" },
    admin,
  );
  assert.equal(updates, 0);
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
  mock.property(bookingMailer, "configured", true);
  mock.method(
    bookingMailer,
    "send",
    async (_record: NotificationRecord, recipient: string) => {
      assert.equal(recipient, "legacy@example.com");
      throw Error("SMTP down");
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
test("admin retry persists statuses through Prisma and rejects invalid ids/kinds", async () => {
  let updates = 0;
  const record = { id };
  mock.method(store.inquiry, "findUnique", async () => record);
  mock.method(store.inquiry, "update", async () => {
    updates++;
    return record;
  });
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
  assert.equal(updates, 1);
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
test("customer page props exclude internal booking notes", async () => {
  mock.method(store.booking, "findMany", async () => [
    { id, adminNotes: "INTERNAL", approverComment: "Public comment" },
  ]);
  mock.method(store.order, "findMany", async () => []);
  const result = await run("GET", "/account", {}, customer);
  assert.ok(!JSON.stringify(result.data).includes("INTERNAL"));
  assert.ok(JSON.stringify(result.data).includes("Public comment"));
});
