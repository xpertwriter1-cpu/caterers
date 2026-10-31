import { app } from "../src/lib/controllers";
import type { RequestContext, ResponseContext } from "../src/lib/router";
import type { PageData, SessionUser } from "../src/lib/types";

export const admin: SessionUser = {
  id: "123456789012345678901234",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
};
export const customer: SessionUser = {
  ...admin,
  name: "Customer",
  role: "customer",
};
export async function run(
  method: string,
  path: string,
  body: Record<string, string> = {},
  user?: SessionUser,
) {
  const result = {
    status: 200,
    redirect: "",
    view: "",
    data: {} as Record<string, unknown>,
    body: undefined as unknown,
  };
  const route = app.match(method, path);
  if (!route) throw new Error("Route not found: " + path);
  const req: RequestContext = {
    params: route.params,
    query: {},
    body,
    get: () => undefined,
    session: {
      user,
      regenerate(callback) {
        delete this.user;
        callback();
      },
      destroy(callback) {
        delete this.user;
        callback();
      },
    },
  };
  const res: ResponseContext = {
    status(code) {
      result.status = code;
      return this;
    },
    set() {
      return this;
    },
    render(view, data) {
      result.view = view;
      result.data = data;
    },
    redirect(code: number | string, path?: string) {
      result.redirect = path || String(code);
    },
    send(message) {
      result.body = message;
    },
    sendStatus(code) {
      result.status = code;
    },
    json(data) {
      result.body = data;
    },
    clearCookie() {},
  };
  await app.run(route, req, res);
  return { ...result, req };
}
export function page(overrides: Partial<PageData> = {}): PageData {
  return {
    view: "home",
    title: "Test",
    currentUser: null,
    flash: null,
    year: 2026,
    bookingStatuses: ["New", "Approved", "Reschedule Requested"],
    emailConfigured: false,
    adminNotificationConfig: { email: false, whatsapp: false },
    services: [],
    bookings: [],
    orders: [],
    inquiries: [],
    customers: 0,
    stats: { bookingCount: 0, orderCount: 0, paidTotal: 0 },
    selectedCategory: "",
    mode: "login",
    audience: "guest",
    paymentsConfigured: false,
    message: "",
    ...overrides,
  };
}
export const id = "123456789012345678901234";
