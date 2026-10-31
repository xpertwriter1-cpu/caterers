import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma, isObjectId } from "./prisma";
import { createBookingMailer, isEmail } from "./booking-email";
import { createAdminNotifier } from "./admin-notifications";
import { createPayments } from "./payments";
import { bookingStatuses } from "./constants";
import { Router, type Handler, type RequestContext } from "./router";

export const dependencies = { db: prisma };
export const app = new Router();
export const bookingMailer = createBookingMailer();
export const adminNotifier = createAdminNotifier({ mailer: bookingMailer });
const payments = createPayments();
const contactFields = { name: true, email: true, phone: true } as const;
const orderStatuses = [
  "Received",
  "Confirmed",
  "Preparing",
  "Ready for dispatch",
  "Out for delivery",
  "Delivered",
  "Cancelled",
];
const noPaymentReference: Prisma.OrderWhereInput = {
  OR: [{ paymentReference: null }, { paymentReference: { isSet: false } }],
};
const today = () =>
  new Date(
    new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }) +
      "T00:00:00+03:00",
  );
function flash(req: RequestContext, type: string, message: string) {
  req.session.flash = { type, message };
}
const requireAuth: Handler = (req, res, next) => {
  if (!req.session.user) {
    flash(req, "warning", "Please sign in to continue.");
    return res.redirect("/login");
  }
  return next();
};
const requireAdmin: Handler = (req, res, next) => {
  if (req.session.user?.role !== "admin") {
    flash(req, "warning", "Administrator access is required.");
    return res.redirect("/admin/login");
  }
  return next();
};

app.get("/", async (_req, res) => {
  const services = await dependencies.db.service.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  res.render("home", {
    title: "Nairobi Catering, Events & Hospitality",
    services,
  });
});
app.get("/services", async (req, res) => {
  const category = [
    "Food",
    "Event Catering",
    "Hospitality",
    "Equipment Hire",
  ].includes(req.query.category)
    ? req.query.category
    : undefined;
  const services = await dependencies.db.service.findMany({
    where: { active: true, category },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  res.render("services", {
    title: "Our Services",
    services,
    selectedCategory: category || "",
  });
});
app.get("/about", (_req, res) =>
  res.render("about", { title: "About Nanny Events & Caterers" }),
);
app.get("/contact", (_req, res) =>
  res.render("contact", { title: "Contact Nanny Events & Caterers" }),
);
app.post("/contact", async (req, res) => {
  const name = (req.body.name || "").trim(),
    email = (req.body.email || "").trim().toLowerCase();
  const subject = (req.body.subject || "").trim(),
    message = (req.body.message || "").trim();
  if (
    !name ||
    name.length > 100 ||
    !isEmail(email) ||
    !message ||
    message.length > 3000 ||
    subject.length > 150
  ) {
    flash(
      req,
      "danger",
      "Enter your name (up to 100 characters), a valid email, subject (up to 150 characters) and message (up to 3000 characters).",
    );
    return res.redirect("/contact");
  }
  const inquiry = await dependencies.db.inquiry.create({
    data: { requesterName: name, requesterEmail: email, subject, message },
  });
  const adminNotifications = await adminNotifier.notify("inquiry", inquiry);
  await dependencies.db.inquiry.update({
    where: { id: inquiry.id },
    data: { adminNotifications },
  });
  flash(
    req,
    "success",
    "Thank you. Your enquiry has been saved for our team to review. We will reply using the email you provided.",
  );
  res.redirect("/contact");
});
app.get("/register", (_req, res) =>
  res.render("auth", { title: "Create Account", mode: "register" }),
);
app.post("/register", async (req, res) => {
  const name = (req.body.name || "").trim(),
    email = (req.body.email || "").trim().toLowerCase(),
    phone = (req.body.phone || "").trim(),
    password = req.body.password || "";
  if (
    !name ||
    name.length > 100 ||
    !isEmail(email) ||
    phone.length > 30 ||
    password.length < 10 ||
    password.length > 128
  ) {
    flash(
      req,
      "danger",
      "Enter your name, valid email and a password of 10 to 128 characters.",
    );
    return res.redirect("/register");
  }
  if (await dependencies.db.user.findUnique({ where: { email } })) {
    flash(req, "danger", "An account with that email already exists.");
    return res.redirect("/register");
  }
  const user = await dependencies.db.user.create({
    data: { name, email, phone, passwordHash: await bcrypt.hash(password, 12) },
  });
  req.session.regenerate(() => {
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  });
  flash(req, "success", "Welcome! Your account is ready.");
  res.redirect("/account");
});
app.get("/login", (_req, res) =>
  res.render("auth", { title: "Sign In", mode: "login", audience: "guest" }),
);
app.get("/admin/login", (_req, res) =>
  res.render("auth", {
    title: "Admin Sign In",
    mode: "login",
    audience: "admin",
  }),
);
const handleLogin =
  (role?: string): Handler =>
  async (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase(),
      password = req.body.password || "";
    const user = isEmail(email)
      ? await dependencies.db.user.findUnique({ where: { email } })
      : null;
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      flash(req, "danger", "Email or password was not recognised.");
      return res.redirect(role === "admin" ? "/admin/login" : "/login");
    }
    if (role && user.role !== role) {
      flash(
        req,
        "danger",
        "This sign-in is for administrators. Use the guest sign-in instead.",
      );
      return res.redirect("/admin/login");
    }
    req.session.regenerate(() => {
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    });
    flash(req, "success", `Welcome back, ${user.name}.`);
    res.redirect(user.role === "admin" ? "/admin" : "/account");
  };
app.post("/login", handleLogin());
app.post("/admin/login", handleLogin("admin"));
app.post("/logout", (req, res) => {
  req.session.destroy(() => {});
  res.redirect("/");
});
app.get("/book", (_req, res) =>
  res.render("book", { title: "Book Catering or Request a Quote" }),
);
app.post("/book", async (req, res) => {
  const { type, eventDate, venue, menuNeeds, notes } = req.body;
  const requesterName = (req.body.requesterName || "").trim(),
    requesterEmail = (req.body.requesterEmail || "").trim().toLowerCase();
  const guestCount = Number(req.body.guestCount),
    date = new Date(eventDate),
    budget = req.body.budget ? Number(req.body.budget) : undefined;
  if (
    !requesterName ||
    requesterName.length > 100 ||
    !isEmail(requesterEmail) ||
    !type ||
    type.length > 100 ||
    !eventDate ||
    Number.isNaN(date.getTime()) ||
    date < today() ||
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 100000 ||
    !venue ||
    venue.length > 300 ||
    (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) ||
    (menuNeeds || "").length > 3000 ||
    (notes || "").length > 3000
  ) {
    flash(
      req,
      "danger",
      "Enter valid contact details, a future event date, guest count, venue and requirements.",
    );
    return res.redirect("/book");
  }
  const booking = await dependencies.db.booking.create({
    data: {
      customerId: req.session.user?.id,
      requesterName,
      requesterEmail,
      type,
      eventDate: date,
      guestCount,
      venue,
      budget,
      menuNeeds,
      notes,
    },
  });
  const adminNotifications = await adminNotifier.notify("booking", booking);
  await dependencies.db.booking.update({
    where: { id: booking.id },
    data: {
      adminNotifications,
      approverNotificationStatus:
        adminNotifications.email === "Accepted" ? "Sent" : "Failed",
    },
  });
  flash(
    req,
    "success",
    `Booking request ${booking.id.slice(-6).toUpperCase()} submitted. Our team will review it and reply to ${requesterEmail}. No account is needed.`,
  );
  res.redirect("/book");
});
app.get("/order/:id", async (req, res) => {
  const service = isObjectId(req.params.id)
    ? await dependencies.db.service.findFirst({
        where: { id: req.params.id, active: true },
      })
    : null;
  if (!service)
    return res.status(404).render("404", { title: "Item Not Found" });
  res.render("order", { title: "Order " + service.name, service });
});
app.post("/order/:id", async (req, res) => {
  const service = isObjectId(req.params.id)
    ? await dependencies.db.service.findFirst({
        where: { id: req.params.id, active: true },
      })
    : null;
  if (!service)
    return res.status(404).render("404", { title: "Item Not Found" });
  const requesterName = (req.body.requesterName || "").trim(),
    requesterEmail = (req.body.requesterEmail || "").trim().toLowerCase();
  const quantity = Number(req.body.quantity),
    phone = (req.body.phone || "").trim(),
    address = (req.body.deliveryAddress || "").trim();
  const date = req.body.deliveryDate
    ? new Date(req.body.deliveryDate + "+03:00")
    : undefined;
  if (
    !requesterName ||
    requesterName.length > 100 ||
    !isEmail(requesterEmail) ||
    !/^\+?[\d ()-]{9,30}$/.test(phone) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 5000 ||
    !address ||
    address.length > 500 ||
    (date && (Number.isNaN(date.getTime()) || date < new Date())) ||
    !["M-PESA", "Card"].includes(req.body.paymentMethod)
  ) {
    flash(
      req,
      "danger",
      "Enter your name, valid email, phone, quantity, delivery details and payment method.",
    );
    return res.redirect("/order/" + service.id);
  }
  const order = await dependencies.db.order.create({
    data: {
      customerId: req.session.user?.id,
      requesterName,
      requesterEmail,
      phone,
      accessToken: crypto.randomBytes(32).toString("hex"),
      items: [
        {
          serviceId: service.id,
          name: service.name,
          quantity,
          unitPrice: service.price,
        },
      ],
      deliveryAddress: address,
      deliveryDate: date,
      notes: (req.body.notes || "").slice(0, 2000),
      total: service.quoteOnly ? 0 : service.price * quantity,
      paymentMethod: req.body.paymentMethod,
    },
  });
  const adminNotifications = await adminNotifier.notify("order", order);
  await dependencies.db.order.update({
    where: { id: order.id },
    data: { adminNotifications, version: { increment: 1 } },
  });
  flash(
    req,
    "success",
    "Request received. Our team will confirm availability, food price and delivery fee before payment.",
  );
  res.redirect("/requests/" + order.accessToken);
});
app.get("/requests/:token", async (req, res) => {
  const order = /^[a-f0-9]{64}$/.test(req.params.token)
    ? await dependencies.db.order.findFirst({
        where: { accessToken: req.params.token },
      })
    : null;
  if (!order)
    return res.status(404).render("404", { title: "Request not found" });
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  res.render("request", {
    title: "Your order request",
    order,
    paymentsConfigured: payments.configured,
  });
});
app.post("/requests/:token/pay", async (req, res) => {
  try {
    const order = await dependencies.db.order.findFirst({
      where: { accessToken: req.params.token },
    });
    if (
      !order ||
      !order.quoted ||
      order.total <= 0 ||
      order.paymentStatus === "Paid" ||
      order.status === "Cancelled"
    )
      return res.status(400).send("This order is not available for payment.");
    if (!payments.configured) {
      flash(
        req,
        "warning",
        "Online payments are not configured yet. Please contact our team.",
      );
      return res.redirect("/requests/" + order.accessToken);
    }
    if (!order.paymentReference) {
      await dependencies.db.order.updateMany({
        where: {
          id: order.id,
          version: order.version,
          status: { not: "Cancelled" },
          paymentStatus: { not: "Paid" },
          ...noPaymentReference,
        },
        data: {
          paymentReference: "nanny-" + crypto.randomBytes(16).toString("hex"),
          version: { increment: 1 },
        },
      });
    }
    const current = await dependencies.db.order.findUnique({
      where: { id: order.id },
    });
    if (!current) return res.sendStatus(404);
    if (
      !current.paymentReference ||
      current.status === "Cancelled" ||
      current.paymentStatus === "Paid"
    )
      return res.redirect("/requests/" + current.accessToken);
    let paymentUrl = current.paymentUrl;
    if (!paymentUrl) {
      const result = await payments.initialize(current);
      if (
        !/^https:\/\/checkout\.paystack\.com\//.test(result.authorization_url)
      )
        throw Error("Invalid checkout URL");
      paymentUrl = result.authorization_url;
      await dependencies.db.order.update({
        where: { id: current.id },
        data: { paymentUrl },
      });
    }
    res.redirect(303, paymentUrl);
  } catch {
    flash(
      req,
      "warning",
      "Unable to start payment. Please try again or contact our team.",
    );
    res.redirect("/requests/" + req.params.token);
  }
});
async function confirmPayment(id: string) {
  await dependencies.db.order.updateMany({
    where: { id, paymentStatus: { not: "Paid" } },
    data: {
      paymentStatus: "Paid",
      paidAt: new Date(),
      version: { increment: 1 },
    },
  });
}
app.get("/requests/:token/verify", async (req, res) => {
  try {
    const order = await dependencies.db.order.findFirst({
      where: { accessToken: req.params.token },
    });
    if (!order) return res.status(404).send("Order not found");
    if (order.paymentStatus !== "Paid" && (await payments.verify(order)))
      await confirmPayment(order.id);
    flash(
      req,
      "success",
      "Payment checked. See the current status below; pending payments can be checked again.",
    );
    res.redirect("/requests/" + order.accessToken);
  } catch {
    flash(
      req,
      "warning",
      "Payment could not be checked yet. Please try again.",
    );
    res.redirect("/requests/" + req.params.token);
  }
});
app.post("/payments/paystack/webhook", async (req, res) => {
  if (
    !req.rawBody ||
    !payments.validSignature(req.rawBody, req.get("x-paystack-signature"))
  )
    return res.sendStatus(401);
  try {
    if (req.webhook?.event === "charge.success") {
      if (typeof req.webhook.data?.reference !== "string")
        return res.sendStatus(400);
      const order = await dependencies.db.order.findFirst({
        where: { paymentReference: req.webhook.data.reference },
      });
      if (
        order &&
        order.paymentStatus !== "Paid" &&
        (await payments.verify(order))
      )
        await confirmPayment(order.id);
    }
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});
app.get("/account", requireAuth, async (req, res) => {
  const [records, orders] = await Promise.all([
    dependencies.db.booking.findMany({
      where: { customerId: req.session.user!.id },
      orderBy: { createdAt: "desc" },
    }),
    dependencies.db.order.findMany({
      where: { customerId: req.session.user!.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  // Internal notes must not enter Next's serialized page props.
  const bookings = records.map(
    ({ adminNotes: _private, ...booking }) => booking,
  );
  res.render("account", { title: "My Account", bookings, orders });
});
app.get("/admin", requireAdmin, async (_req, res) => {
  const [
    bookings,
    orders,
    services,
    customers,
    bookingCount,
    orderCount,
    paid,
    inquiries,
  ] = await Promise.all([
    dependencies.db.booking.findMany({
      include: { customer: { select: contactFields } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    dependencies.db.order.findMany({
      include: { customer: { select: contactFields } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    dependencies.db.service.findMany({ orderBy: { createdAt: "desc" } }),
    dependencies.db.user.count({ where: { role: "customer" } }),
    dependencies.db.booking.count(),
    dependencies.db.order.count(),
    dependencies.db.order.aggregate({
      where: { paymentStatus: "Paid" },
      _sum: { total: true },
    }),
    dependencies.db.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  res.render("admin", {
    title: "Admin Dashboard",
    bookings,
    orders,
    services,
    customers,
    inquiries,
    stats: { bookingCount, orderCount, paidTotal: paid._sum.total || 0 },
  });
});
app.post(
  "/admin/notifications/:kind/:id/retry",
  requireAdmin,
  async (req, res) => {
    const { kind, id } = req.params;
    if (!isObjectId(id) || !["booking", "order", "inquiry"].includes(kind))
      return res.sendStatus(404);
    const record =
      kind === "booking"
        ? await dependencies.db.booking.findUnique({ where: { id } })
        : kind === "order"
          ? await dependencies.db.order.findUnique({ where: { id } })
          : await dependencies.db.inquiry.findUnique({ where: { id } });
    if (!record) return res.sendStatus(404);
    const adminNotifications = await adminNotifier.notify(
      kind as "booking" | "order" | "inquiry",
      record,
      true,
    );
    if (kind === "booking")
      await dependencies.db.booking.update({
        where: { id },
        data: {
          adminNotifications,
          approverNotificationStatus:
            adminNotifications.email === "Accepted" ? "Sent" : "Failed",
        },
      });
    else if (kind === "order")
      await dependencies.db.order.update({
        where: { id },
        data: { adminNotifications },
      });
    else
      await dependencies.db.inquiry.update({
        where: { id },
        data: { adminNotifications },
      });
    flash(
      req,
      adminNotifications.email === "Accepted" &&
        adminNotifications.whatsapp === "Accepted"
        ? "success"
        : "warning",
      "Admin alert retry completed. Check each channel status in the dashboard.",
    );
    res.redirect("/admin");
  },
);
app.post("/admin/services", requireAdmin, async (req, res) => {
  const { name, category, description, unit, image } = req.body,
    price = Number(req.body.price);
  if (
    !name ||
    name.length > 150 ||
    !description ||
    description.length > 1000 ||
    !["Food", "Event Catering", "Hospitality", "Equipment Hire"].includes(
      category,
    ) ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    flash(req, "danger", "Please provide valid service details and price.");
    return res.redirect("/admin");
  }
  await dependencies.db.service.create({
    data: {
      name,
      category,
      description,
      price,
      unit: unit || "per order",
      image: image || "",
    },
  });
  flash(req, "success", "Service added.");
  res.redirect("/admin");
});
app.post("/admin/services/:id/toggle", requireAdmin, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.sendStatus(404);
  const service = await dependencies.db.service.findUnique({
    where: { id: req.params.id },
  });
  if (service)
    await dependencies.db.service.update({
      where: { id: service.id },
      data: { active: !service.active },
    });
  flash(req, "success", "Service availability updated.");
  res.redirect("/admin");
});
app.post("/admin/bookings/:id", requireAdmin, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.sendStatus(404);
  const booking = await dependencies.db.booking.findUnique({
    where: { id: req.params.id },
    include: { customer: { select: contactFields } },
  });
  if (!booking) {
    flash(req, "danger", "Booking not found.");
    return res.redirect("/admin");
  }
  const status = req.body.status,
    comment = (req.body.approverComment || "").trim(),
    sendEmail = req.body.sendEmail === "on";
  const proposedDate = req.body.proposedDate
      ? new Date(req.body.proposedDate)
      : null,
    recipient = booking.requesterEmail || booking.customer?.email;
  if (
    !bookingStatuses.includes(status) ||
    comment.length > 3000 ||
    (proposedDate && Number.isNaN(proposedDate.getTime())) ||
    (status === "Reschedule Requested" &&
      (!proposedDate || proposedDate < today() || !comment))
  ) {
    flash(
      req,
      "danger",
      "Choose a valid status. Rescheduling requires a future proposed date and a comment.",
    );
    return res.redirect("/admin");
  }
  if (sendEmail && (!bookingMailer.configured || !isEmail(recipient))) {
    flash(
      req,
      "danger",
      "Configure SMTP and check the requester email, or use Save without emailing.",
    );
    return res.redirect("/admin");
  }
  const quoteAmount =
    req.body.quoteAmount !== undefined && req.body.quoteAmount !== ""
      ? Number(req.body.quoteAmount)
      : undefined;
  if (
    quoteAmount !== undefined &&
    (!Number.isFinite(quoteAmount) || quoteAmount < 0)
  ) {
    flash(req, "danger", "Enter a valid quotation amount.");
    return res.redirect("/admin");
  }
  const updated = await dependencies.db.booking.update({
    where: { id: booking.id },
    data: {
      status,
      quoteAmount,
      adminNotes: (req.body.adminNotes || "").slice(0, 3000),
      approverComment: comment,
      proposedDate: status === "Reschedule Requested" ? proposedDate : null,
      reviewedAt: new Date(),
      emailStatus: sendEmail ? "Pending" : "Not sent",
      emailedAt: null,
    },
  });
  if (sendEmail) {
    try {
      await bookingMailer.send(updated, recipient!);
      await dependencies.db.booking.update({
        where: { id: booking.id },
        data: { emailStatus: "Sent", emailedAt: new Date() },
      });
      flash(
        req,
        "success",
        "Booking updated. The email provider accepted the update for the requester.",
      );
    } catch {
      await dependencies.db.booking.update({
        where: { id: booking.id },
        data: { emailStatus: "Failed" },
      });
      flash(
        req,
        "warning",
        "Booking and comments saved, but email failed. Check email configuration and retry.",
      );
    }
  } else
    flash(
      req,
      "success",
      "Booking updated. The requester can see your comments in their account. No email was sent.",
    );
  res.redirect("/admin");
});
app.post("/admin/orders/:id", requireAdmin, async (req, res) => {
  if (!isObjectId(req.params.id)) return res.sendStatus(404);
  const order = await dependencies.db.order.findUnique({
    where: { id: req.params.id },
    include: { customer: { select: contactFields } },
  });
  if (!order) return res.status(404).send("Order not found");
  const status = req.body.status;
  if (!orderStatuses.includes(status))
    return res.status(400).send("Invalid order status");
  if (
    [
      "Preparing",
      "Ready for dispatch",
      "Out for delivery",
      "Delivered",
    ].includes(status) &&
    order.paymentStatus !== "Paid"
  ) {
    flash(
      req,
      "warning",
      "Payment must be verified before preparing or dispatching this order.",
    );
    return res.redirect("/admin");
  }
  const data: Prisma.OrderUpdateManyMutationInput = {
    status,
    deliveryContact: (req.body.deliveryContact || "").slice(0, 200),
    deliveryNotes: (req.body.deliveryNotes || "").slice(0, 1000),
    version: { increment: 1 },
  };
  let requoting = false;
  if (
    !order.paymentReference &&
    order.paymentStatus !== "Paid" &&
    req.body.foodTotal !== undefined &&
    req.body.foodTotal !== ""
  ) {
    const food = Number(req.body.foodTotal),
      fee = Number(req.body.deliveryFee || 0);
    if (
      !Number.isFinite(food) ||
      food <= 0 ||
      !Number.isFinite(fee) ||
      fee < 0 ||
      food + fee > 10000000
    )
      return res.status(400).send("Enter valid food and delivery amounts");
    data.total = Math.round((food + fee) * 100) / 100;
    data.deliveryFee = Math.round(fee * 100) / 100;
    data.quoted = true;
    requoting = true;
  }
  const changed = await dependencies.db.order.updateMany({
    where: {
      id: order.id,
      version: order.version,
      ...(requoting
        ? { ...noPaymentReference, paymentStatus: { not: "Paid" } }
        : {}),
    },
    data,
  });
  if (changed.count !== 1) {
    flash(
      req,
      "warning",
      "This order changed while you were editing. Refresh and review it before saving again.",
    );
    return res.redirect("/admin");
  }
  if (req.body.emailOrder === "on") {
    try {
      const updated = await dependencies.db.order.findUnique({
        where: { id: order.id },
        include: { customer: { select: contactFields } },
      });
      if (updated) await bookingMailer.sendOrder(updated);
      flash(req, "success", "Order saved and emailed to the requester.");
    } catch {
      flash(
        req,
        "warning",
        "Order saved, but email failed. Check SMTP settings and try again.",
      );
    }
  } else flash(req, "success", "Order updated.");
  res.redirect("/admin");
});
app.get("/health", async (_req, res) => {
  try {
    await dependencies.db.$runCommandRaw({ ping: 1 });
    res.json({
      ok: true,
      database: "connected",
      provider: "MongoDB Atlas",
      orm: "Prisma",
    });
  } catch {
    res
      .status(503)
      .json({
        ok: false,
        database: "disconnected",
        provider: "MongoDB Atlas",
        orm: "Prisma",
      });
  }
});
