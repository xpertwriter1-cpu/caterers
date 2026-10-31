import type { GetServerSideProps, NextApiRequest, NextApiResponse } from "next";
import type { IncomingMessage, ServerResponse } from "node:http";
import { app, adminNotifier, bookingMailer } from "./controllers";
import { connectDatabase } from "./db";
import { getSession } from "./session";
import { bookingStatuses } from "./constants";
import { createPayments } from "./payments";
import type { RequestContext, ResponseContext } from "./router";
import type { PageData, ViewName } from "./types";

interface Outcome {
  status: number;
  view?: ViewName;
  data?: Record<string, unknown>;
  redirect?: string;
  body?: unknown;
}
export async function dispatch(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  body: Record<string, string> = {},
  rawBody?: Buffer,
): Promise<{ outcome: Outcome; page: PageData }> {
  const outcome: Outcome = { status: 200 };
  const session = await getSession(req, res);
  const flash = session.flash || null;
  delete session.flash;
  let destroyed = false;
  const sessionContext: RequestContext["session"] = {
    user: session.user,
    regenerate(callback) {
      delete this.user;
      delete this.flash;
      callback();
    },
    destroy(callback) {
      destroyed = true;
      session.destroy();
      delete this.user;
      delete this.flash;
      callback();
    },
  };
  const url = new URL(req.url || "/", "http://localhost");
  const route = app.match(req.method || "GET", pathname);
  const request: RequestContext = {
    params: route?.params || {},
    query: Object.fromEntries(url.searchParams),
    body,
    session: sessionContext,
    rawBody,
    get(name) {
      const value = req.headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] : value;
    },
  };
  if (rawBody && pathname === "/payments/paystack/webhook") {
    try {
      request.webhook = JSON.parse(rawBody.toString("utf8"));
    } catch {
      outcome.status = 400;
      outcome.body = "Invalid JSON";
    }
  }
  const response: ResponseContext = {
    status(code) {
      outcome.status = code;
      return this;
    },
    set(name, value) {
      res.setHeader(name, value);
      return this;
    },
    render(view, data) {
      outcome.view = view;
      outcome.data = data;
    },
    redirect(codeOrPath: number | string, path?: string) {
      outcome.status = typeof codeOrPath === "number" ? codeOrPath : 303;
      outcome.redirect = path || String(codeOrPath);
    },
    send(message) {
      outcome.body = message;
    },
    sendStatus(code) {
      outcome.status = code;
      outcome.body = String(code);
    },
    json(data) {
      outcome.body = data;
    },
    clearCookie() {
      /* The encrypted session cookie is cleared by session.destroy(). */
    },
  };
  try {
    if (route && !outcome.body) {
      const accessDenied =
        (pathname.startsWith("/admin") &&
          pathname !== "/admin/login" &&
          sessionContext.user?.role !== "admin") ||
        (pathname === "/account" && !sessionContext.user);
      const needsDatabase =
        !accessDenied &&
        (![
          "/about",
          "/contact",
          "/book",
          "/login",
          "/register",
          "/admin/login",
          "/logout",
          "/health",
        ].includes(pathname) ||
          (req.method === "POST" && pathname !== "/logout"));
      if (needsDatabase) await connectDatabase();
      await app.run(route, request, response);
    } else if (!route) {
      outcome.status = 404;
      outcome.view = "404";
    }
  } catch (error) {
    const duplicate =
      error instanceof Error && "code" in error && error.code === "P2002";
    outcome.status = duplicate ? 400 : 500;
    outcome.view = "error";
    // Never return database credentials, connection strings or provider secrets to clients.
    outcome.data = {
      title: "Something Went Wrong",
      message: duplicate
        ? "That record already exists. Please review your details."
        : "Unable to complete this request. Please try again or contact our team.",
    };
    console.error(
      "Request failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
  }
  if (!destroyed) {
    session.user = sessionContext.user;
    session.flash = sessionContext.flash;
    await session.save();
  }
  const page: PageData = {
    view: outcome.view || "404",
    title: "Nanny Events & Caterers",
    currentUser: sessionContext.user || null,
    flash,
    year: new Date().getFullYear(),
    bookingStatuses,
    emailConfigured: bookingMailer.configured,
    adminNotificationConfig: adminNotifier.configured,
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
    ...JSON.parse(JSON.stringify(outcome.data || {})),
  };
  res.setHeader("Cache-Control", "private, no-store");
  if (pathname.startsWith("/requests/"))
    res.setHeader("Referrer-Policy", "no-referrer");
  return { outcome, page };
}

export const getPageProps: GetServerSideProps<PageData> = async ({
  req,
  res,
  resolvedUrl,
}) => {
  const pathname = new URL(resolvedUrl, "http://localhost").pathname;
  const { outcome, page } = await dispatch(req, res, pathname);
  if (outcome.redirect)
    return { redirect: { destination: outcome.redirect, permanent: false } };
  res.statusCode = outcome.status;
  return { props: page };
};

export async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  const path = req.query.path;
  const pathname = "/" + (Array.isArray(path) ? path.join("/") : path || "");
  if (!["GET", "POST"].includes(req.method || "")) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }
  // Browser form requests must originate from this site; provider webhooks use HMAC instead.
  if (
    req.method === "POST" &&
    pathname !== "/payments/paystack/webhook" &&
    req.headers.origin
  ) {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(req.headers.origin).host === req.headers.host;
    } catch {
      /* Invalid origin. */
    }
    if (!sameOrigin)
      return res.status(403).send("Request origin is not allowed.");
  }
  let rawBody: Buffer;
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 100 * 1024)
        return res.status(413).send("Request is too large.");
      chunks.push(buffer);
    }
    rawBody = Buffer.concat(chunks);
  } catch {
    return res.status(400).send("Unable to read request.");
  }
  if (
    pathname === "/payments/paystack/webhook" &&
    !createPayments().validSignature(
      rawBody,
      req.headers["x-paystack-signature"],
    )
  ) {
    return res.status(401).end();
  }
  const body: Record<string, string> = {};
  if (pathname !== "/payments/paystack/webhook") {
    for (const [key, value] of new URLSearchParams(rawBody.toString("utf8")))
      body[key] = value;
  }
  const { outcome } = await dispatch(req, res, pathname, body, rawBody);
  if (outcome.redirect) return res.redirect(outcome.status, outcome.redirect);
  if (outcome.view)
    return res
      .status(outcome.status)
      .send(outcome.data?.message || "Request could not be completed.");
  if (typeof outcome.body === "object")
    return res.status(outcome.status).json(outcome.body);
  return res.status(outcome.status).send(outcome.body ?? "");
}
