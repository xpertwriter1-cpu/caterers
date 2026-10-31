import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "../src/components/Page";
import { Layout } from "../src/components/Layout";
import { page, customer, id } from "./helpers";
import type { PageData } from "../src/lib/types";

const service: NonNullable<PageData["service"]> = {
  _id: id,
  name: "Pilau",
  price: 0,
  quoteOnly: true,
  unit: "request a quote",
  category: "Food",
  description: "Fresh pilau",
  image: "/images/pilau-rice.jpg",
  active: true,
  createdAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
const order: NonNullable<PageData["order"]> = {
  _id: id,
  requesterName: "Guest",
  requesterEmail: "guest@example.com",
  phone: "0723548397",
  items: [{ name: "Pilau", quantity: 20 }],
  total: 5000,
  deliveryFee: 500,
  quoted: true,
  paymentMethod: "M-PESA",
  accessToken: "a".repeat(64),
  status: "Confirmed",
  paymentStatus: "Pending",
  deliveryAddress: "Nairobi",
  createdAt: "2026-10-31",
  updatedAt: "2026-10-31",
};
const render = (props: PageData) =>
  renderToStaticMarkup(
    createElement(Layout, {
      currentUser: props.currentUser,
      flash: props.flash,
      year: props.year,
      children: createElement(Page, props),
    }),
  );

test("all migrated React views render with matching forms and preserved assets", () => {
  for (const view of [
    "home",
    "services",
    "about",
    "contact",
    "auth",
    "book",
    "order",
    "request",
    "account",
    "admin",
    "404",
    "error",
  ] as const) {
    const html = render(
      page({
        view,
        service,
        order,
        services: [service],
        orders: [order],
        currentUser: customer,
      }),
    );
    assert.ok(html.length > 1000, view);
    assert.equal(
      (html.match(/src="\/images\/nanny-events-logo\.png"/g) || []).length,
      2,
    );
    if (view === "home") {
      assert.ok(html.includes('id="event-gallery"'));
      assert.equal((html.match(/<video /g) || []).length, 6);
    }
    if (view === "book") assert.ok(html.includes('action="/api/book"'));
    if (view === "order") assert.ok(html.includes(`action="/api/order/${id}"`));
    if (view === "request") assert.ok(html.includes("awaiting setup"));
    if (view === "admin") assert.ok(!html.includes('name="paymentStatus"'));
  }
});

test("admin enquiry messages escape markup and offer scoped notification retries", () => {
  const html = render(
    page({
      view: "admin",
      inquiries: [
        {
          _id: id,
          requesterName: "Guest",
          requesterEmail: "guest@example.com",
          message: '<script>alert("test")</script>',
          createdAt: "2026-10-31",
          updatedAt: "2026-10-31",
          adminNotifications: { email: "Failed", whatsapp: "Accepted" },
        },
      ],
    }),
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes(`/api/admin/notifications/inquiry/${id}/retry`));
  assert.ok(html.includes("mailto:guest@example.com"));
});

test("guest and admin sign-in and registration expose the correct Next API actions", () => {
  const guest = render(page({ view: "auth" }));
  assert.ok(guest.includes("Continue as a guest"));
  assert.ok(guest.includes('href="/admin/login"'));
  assert.ok(guest.includes('action="/api/login"'));
  const admin = render(page({ view: "auth", audience: "admin" }));
  assert.ok(admin.includes('action="/api/admin/login"'));
  assert.ok(admin.includes("Access the dashboard"));
  const registration = render(page({ view: "auth", mode: "register" }));
  assert.ok(registration.includes('action="/api/register"'));
  assert.ok(registration.includes('name="name"'));
  assert.ok(registration.includes('minLength="10"'));
});

test("checkout is offered only for quoted, unpaid, active orders with payment setup", () => {
  for (const [changes, offered] of [
    [{}, true],
    [{ quoted: false }, false],
    [{ paymentStatus: "Paid" }, false],
    [{ status: "Cancelled" }, false],
  ] as const) {
    const html = render(
      page({
        view: "request",
        order: { ...order, ...changes },
        paymentsConfigured: true,
      }),
    );
    assert.equal(
      html.includes(`/api/requests/${order.accessToken}/pay`),
      offered,
    );
  }
});
