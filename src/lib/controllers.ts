import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { User, Service, Booking, Order, Inquiry } from "./models";
import { createBookingMailer, isEmail } from "./booking-email";
import { createAdminNotifier } from "./admin-notifications";
import { createPayments } from "./payments";
import { bookingStatuses } from "./constants";
import { Router, type Handler, type RequestContext } from "./router";

export const app = new Router();
export const bookingMailer = createBookingMailer();
export const adminNotifier = createAdminNotifier({ mailer: bookingMailer });
const payments = createPayments();
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

app.get("/", async (req, res, next) => {
  try {
    const services = await Service.find({ active: true })
      .sort({ createdAt: -1 })
      .limit(6);
    res.render("home", {
      title: "Nairobi Catering, Events & Hospitality",
      services,
    });
  } catch (e) {
    return next(e);
  }
});

app.get("/services", async (req, res, next) => {
  try {
    const filter: { category?: string } = {};
    if (
      ["Food", "Event Catering", "Hospitality", "Equipment Hire"].includes(
        req.query.category,
      )
    )
      filter.category = req.query.category;
    const services = await Service.find({ ...filter, active: true }).sort({
      category: 1,
      name: 1,
    });
    res.render("services", {
      title: "Our Services",
      services,
      selectedCategory: req.query.category || "",
    });
  } catch (e) {
    return next(e);
  }
});

app.get("/about", (req, res) =>
  res.render("about", { title: "About Nanny Events & Caterers" }),
);
app.get("/contact", (req, res) =>
  res.render("contact", { title: "Contact Nanny Events & Caterers" }),
);
app.post("/contact", async (req, res, next) => {
  try {
    const text = (key: string) =>
      typeof req.body[key] === "string" ? req.body[key].trim() : "";
    const name = text("name"),
      email = text("email").toLowerCase();
    const subject = text("subject"),
      message = text("message");
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
    const inquiry = await Inquiry.create({
      requesterName: name,
      requesterEmail: email,
      subject,
      message,
    });
    inquiry.adminNotifications = await adminNotifier.notify("inquiry", inquiry);
    await inquiry.save();
    flash(
      req,
      "success",
      "Thank you. Your enquiry has been saved for our team to review. We will reply using the email you provided.",
    );
    res.redirect("/contact");
  } catch (error) {
    return next(error);
  }
});

app.get("/register", (req, res) =>
  res.render("auth", { title: "Create Account", mode: "register" }),
);
app.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");
    if (
      !name ||
      name.length > 100 ||
      !isEmail(email) ||
      password.length < 10 ||
      password.length > 128
    ) {
      flash(
        req,
        "danger",
        "Enter your name and email, and use a password of at least 10 characters.",
      );
      return res.redirect("/register");
    }
    if (await User.findOne({ email })) {
      flash(req, "danger", "An account with that email already exists.");
      return res.redirect("/register");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, passwordHash });
    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
    flash(req, "success", "Welcome! Your account is ready.");
    res.redirect("/account");
  } catch (e) {
    return next(e);
  }
});

app.get("/login", (req, res) =>
  res.render("auth", { title: "Sign In", mode: "login", audience: "guest" }),
);
app.get("/admin/login", (req, res) =>
  res.render("auth", {
    title: "Admin Sign In",
    mode: "login",
    audience: "admin",
  }),
);
const handleLogin =
  (requiredRole?: string): Handler =>
  async (req, res, next) => {
    try {
      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();
      const password = String(req.body.password || "");
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        flash(req, "danger", "Email or password was not recognised.");
        return res.redirect(
          requiredRole === "admin" ? "/admin/login" : "/login",
        );
      }
      if (requiredRole && user.role !== requiredRole) {
        flash(
          req,
          "danger",
          "This sign-in is for administrators. Use the guest sign-in instead.",
        );
        return res.redirect("/admin/login");
      }
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
        flash(req, "success", `Welcome back, ${user.name}.`);
        res.redirect(user.role === "admin" ? "/admin" : "/account");
      });
    } catch (e) {
      return next(e);
    }
  };
app.post("/login", handleLogin());
app.post("/admin/login", handleLogin("admin"));
app.post("/logout", (req, res, next) =>
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("connect.sid");
    res.redirect("/");
  }),
);

app.get("/book", (req, res) =>
  res.render("book", { title: "Book Catering or Request a Quote" }),
);
app.post("/book", async (req, res, next) => {
  try {
    const { type, eventDate, guestCount, venue, budget, menuNeeds, notes } =
      req.body;
    const requesterEmail = String(req.body.requesterEmail || "")
      .trim()
      .toLowerCase();
    const requesterName = String(req.body.requesterName || "").trim();
    if (!requesterName || requesterName.length > 100) {
      flash(req, "danger", "Please enter your name (up to 100 characters).");
      return res.redirect("/book");
    }
    if (!isEmail(requesterEmail)) {
      flash(
        req,
        "danger",
        "Please enter a valid requester email address for booking updates.",
      );
      return res.redirect("/book");
    }
    const date = new Date(eventDate);
    if (
      !type ||
      !eventDate ||
      Number.isNaN(date.getTime()) ||
      date <
        new Date(
          new Date().toLocaleDateString("en-CA", {
            timeZone: "Africa/Nairobi",
          }) + "T00:00:00+03:00",
        ) ||
      !Number.isInteger(Number(guestCount)) ||
      Number(guestCount) < 1 ||
      !venue
    ) {
      flash(
        req,
        "danger",
        "Please provide a valid future event date, guest count, event type and venue.",
      );
      return res.redirect("/book");
    }
    const booking = await Booking.create({
      customer: req.session.user?.id,
      requesterName,
      requesterEmail,
      type,
      eventDate: date,
      guestCount: Number(guestCount),
      venue,
      budget: budget ? Number(budget) : undefined,
      menuNeeds,
      notes,
    });
    booking.adminNotifications = await adminNotifier.notify("booking", booking);
    booking.approverNotificationStatus =
      booking.adminNotifications.email === "Accepted" ? "Sent" : "Failed";
    await booking.save();
    flash(
      req,
      "success",
      `Booking request ${booking._id.toString().slice(-6).toUpperCase()} submitted. Our team will review it and reply to ${requesterEmail}. No account is needed.`,
    );
    res.redirect("/book");
  } catch (e) {
    return next(e);
  }
});

app.get("/order/:id", async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, active: true });
    if (!service)
      return res.status(404).render("404", { title: "Item Not Found" });
    res.render("order", { title: "Order " + service.name, service });
  } catch (e) {
    return next(e);
  }
});
app.post("/order/:id", async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, active: true });
    if (!service)
      return res.status(404).render("404", { title: "Item Not Found" });
    const quantity = Number(req.body.quantity);
    const requesterName = String(req.body.requesterName || "").trim();
    const requesterEmail = String(req.body.requesterEmail || "")
      .trim()
      .toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const address = String(req.body.deliveryAddress || "").trim();
    const date = req.body.deliveryDate
      ? new Date(req.body.deliveryDate)
      : undefined;
    if (
      !requesterName ||
      requesterName.length > 100 ||
      !isEmail(requesterEmail) ||
      !/^[+\d ()-]{9,30}$/.test(phone) ||
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
      return res.redirect("/order/" + service._id);
    }
    const order = await Order.create({
      customer: req.session.user?.id,
      requesterName,
      requesterEmail,
      phone,
      accessToken: crypto.randomBytes(32).toString("hex"),
      items: [
        {
          service: service._id,
          name: service.name,
          quantity,
          unitPrice: service.price,
        },
      ],
      deliveryAddress: address,
      deliveryDate: date,
      notes: String(req.body.notes || "").slice(0, 2000),
      total: service.quoteOnly ? 0 : service.price * quantity,
      paymentMethod: req.body.paymentMethod,
    });
    order.adminNotifications = await adminNotifier.notify("order", order);
    await order.save();
    flash(
      req,
      "success",
      "Request received. Our team will confirm availability, food price and delivery fee before payment.",
    );
    res.redirect("/requests/" + order.accessToken);
  } catch (e) {
    return next(e);
  }
});

app.get("/requests/:token", async (req, res, next) => {
  try {
    const order = /^[a-f0-9]{64}$/.test(req.params.token)
      ? await Order.findOne({ accessToken: req.params.token })
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
  } catch (e) {
    return next(e);
  }
});
app.post("/requests/:token/pay", async (req, res, next) => {
  try {
    const order = await Order.findOne({ accessToken: req.params.token });
    if (
      !order ||
      !order.quoted ||
      order.total <= 0 ||
      order.paymentStatus === "Paid" ||
      order.status === "Cancelled"
    ) {
      return res.status(400).send("This order is not available for payment.");
    }
    if (!payments.configured) {
      flash(
        req,
        "warning",
        "Online payments are not configured yet. Please contact our team.",
      );
      return res.redirect("/requests/" + order.accessToken);
    }
    if (!order.paymentReference) {
      await Order.updateOne(
        {
          _id: order._id,
          paymentReference: { $exists: false },
          status: { $ne: "Cancelled" },
        },
        {
          $set: {
            paymentReference: "nanny-" + crypto.randomBytes(16).toString("hex"),
          },
          $inc: { __v: 1 },
        },
      );
    }
    const current = await Order.findById(order._id);
    if (!current) return res.sendStatus(404);
    if (
      !current.paymentReference ||
      current.status === "Cancelled" ||
      current.paymentStatus === "Paid"
    )
      return res.redirect("/requests/" + current.accessToken);
    if (!current.paymentUrl) {
      const result = await payments.initialize(current);
      if (
        !/^https:\/\/checkout\.paystack\.com\//.test(result.authorization_url)
      )
        throw new Error("Invalid checkout URL");
      current.paymentUrl = result.authorization_url;
      await current.save();
    }
    res.redirect(303, current.paymentUrl);
  } catch (e) {
    flash(
      req,
      "warning",
      "Unable to start payment. Please try again or contact our team.",
    );
    res.redirect("/requests/" + req.params.token);
  }
});
app.get("/requests/:token/verify", async (req, res, next) => {
  try {
    const order = await Order.findOne({ accessToken: req.params.token });
    if (!order) return res.status(404).send("Order not found");
    if (order.paymentStatus !== "Paid" && (await payments.verify(order))) {
      await Order.updateOne(
        { _id: order._id, paymentStatus: { $ne: "Paid" } },
        { $set: { paymentStatus: "Paid", paidAt: new Date() } },
      );
    }
    flash(
      req,
      "success",
      order.paymentStatus === "Paid"
        ? "Payment already confirmed."
        : "Payment checked. See the current status below; pending payments can be checked again.",
    );
    res.redirect("/requests/" + order.accessToken);
  } catch (e) {
    flash(
      req,
      "warning",
      "Payment could not be checked yet. Please try again.",
    );
    res.redirect("/requests/" + req.params.token);
  }
});
app.post("/payments/paystack/webhook", async (req, res, next) => {
  if (
    !req.rawBody ||
    !payments.validSignature(req.rawBody, req.get("x-paystack-signature"))
  )
    return res.sendStatus(401);
  try {
    if (req.webhook?.event === "charge.success") {
      if (typeof req.webhook?.data?.reference !== "string")
        return res.sendStatus(400);
      const order = await Order.findOne({
        paymentReference: req.webhook!.data!.reference,
      });
      if (
        order &&
        order.paymentStatus !== "Paid" &&
        (await payments.verify(order))
      ) {
        await Order.updateOne(
          { _id: order._id, paymentStatus: { $ne: "Paid" } },
          { $set: { paymentStatus: "Paid", paidAt: new Date() } },
        );
      }
    }
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(503);
  }
});

app.get("/account", requireAuth, async (req, res, next) => {
  try {
    const [bookings, orders] = await Promise.all([
      Booking.find({ customer: req.session.user!.id })
        .select("-adminNotes")
        .sort({ createdAt: -1 }),
      Order.find({ customer: req.session.user!.id }).sort({ createdAt: -1 }),
    ]);
    res.render("account", { title: "My Account", bookings, orders });
  } catch (e) {
    return next(e);
  }
});

app.get("/admin", requireAdmin, async (req, res, next) => {
  try {
    const [bookings, orders, services, customers, stats, inquiries] =
      await Promise.all([
        Booking.find()
          .populate("customer", "name email phone")
          .sort({ createdAt: -1 })
          .limit(100),
        Order.find()
          .populate("customer", "name email phone")
          .sort({ createdAt: -1 })
          .limit(100),
        Service.find().sort({ createdAt: -1 }),
        User.countDocuments({ role: "customer" }),
        Promise.all([
          Booking.countDocuments(),
          Order.countDocuments(),
          Order.aggregate([
            { $match: { paymentStatus: "Paid" } },
            { $group: { _id: null, total: { $sum: "$total" } } },
          ]),
        ]),
        Inquiry.find().sort({ createdAt: -1 }).limit(100),
      ]);
    res.render("admin", {
      title: "Admin Dashboard",
      bookings,
      orders,
      services,
      customers,
      inquiries,
      stats: {
        bookingCount: stats[0],
        orderCount: stats[1],
        paidTotal: stats[2][0]?.total || 0,
      },
    });
  } catch (e) {
    return next(e);
  }
});

app.post(
  "/admin/notifications/:kind/:id/retry",
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
      const kind = req.params.kind;
      if (kind !== "booking" && kind !== "order" && kind !== "inquiry")
        return res.sendStatus(404);
      const record =
        req.params.kind === "booking"
          ? await Booking.findById(req.params.id)
          : req.params.kind === "order"
            ? await Order.findById(req.params.id)
            : req.params.kind === "inquiry"
              ? await Inquiry.findById(req.params.id)
              : null;
      if (!record) return res.sendStatus(404);
      record.adminNotifications = await adminNotifier.notify(
        kind,
        record,
        true,
      );
      if (req.params.kind === "booking")
        if ("approverNotificationStatus" in record)
          record.approverNotificationStatus =
            record.adminNotifications.email === "Accepted" ? "Sent" : "Failed";
      await record.save();
      const accepted =
        record.adminNotifications.email === "Accepted" &&
        record.adminNotifications.whatsapp === "Accepted";
      flash(
        req,
        accepted ? "success" : "warning",
        accepted
          ? "Admin alerts accepted by both providers."
          : "Admin alert retry completed. Check each channel's status and configuration.",
      );
      res.redirect("/admin");
    } catch (error) {
      return next(error);
    }
  },
);

app.post("/admin/services", requireAdmin, async (req, res, next) => {
  try {
    const { name, category, description, price, unit, image } = req.body;
    if (
      !name ||
      !description ||
      !["Food", "Event Catering", "Hospitality", "Equipment Hire"].includes(
        category,
      ) ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      flash(req, "danger", "Please provide valid service details and price.");
      return res.redirect("/admin");
    }
    await Service.create({
      name,
      category,
      description,
      price: Number(price),
      unit: unit || "per order",
      image: image || "",
    });
    flash(req, "success", "Service added.");
    res.redirect("/admin");
  } catch (e) {
    return next(e);
  }
});

app.post("/admin/services/:id/toggle", requireAdmin, async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (service) {
      service.active = !service.active;
      await service.save();
    }
    flash(req, "success", "Service availability updated.");
    res.redirect("/admin");
  } catch (e) {
    return next(e);
  }
});

app.post("/admin/bookings/:id", requireAdmin, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate<{
      customer?: { email?: string };
    }>("customer", "email");
    if (!booking) {
      flash(req, "danger", "Booking not found.");
      return res.redirect("/admin");
    }
    const comment = String(req.body.approverComment || "").trim();
    const proposedDate = req.body.proposedDate
      ? new Date(req.body.proposedDate)
      : null;
    const sendEmail = req.body.sendEmail === "on";
    const recipient = booking.requesterEmail || booking.customer?.email;
    if (
      !bookingStatuses.includes(req.body.status) ||
      comment.length > 3000 ||
      (proposedDate && Number.isNaN(proposedDate.getTime())) ||
      (req.body.status === "Reschedule Requested" &&
        (!proposedDate ||
          proposedDate <
            new Date(
              new Date().toLocaleDateString("en-CA", {
                timeZone: "Africa/Nairobi",
              }) + "T00:00:00+03:00",
            ) ||
          !comment))
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
        "Email was not sent and changes were not saved. Configure SMTP and check the requester email, or use Save without emailing.",
      );
      return res.redirect("/admin");
    }
    booking.status = req.body.status;
    if (req.body.quoteAmount !== "" && req.body.quoteAmount !== undefined) {
      const amount = Number(req.body.quoteAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        flash(req, "danger", "Enter a valid quotation amount.");
        return res.redirect("/admin");
      }
      booking.quoteAmount = amount;
    }
    booking.adminNotes = String(req.body.adminNotes || "").slice(0, 3000);
    booking.approverComment = comment;
    booking.proposedDate =
      booking.status === "Reschedule Requested" ? proposedDate : undefined;
    booking.reviewedAt = new Date();
    booking.emailStatus = sendEmail ? "Pending" : "Not sent";
    booking.emailedAt = undefined;
    await booking.save();
    if (sendEmail) {
      try {
        await bookingMailer.send(booking, recipient!);
      } catch (error) {
        booking.emailStatus = "Failed";
        await booking.save();
        flash(
          req,
          "warning",
          "Booking and comments saved, but email failed. Check the email configuration and try Save and email again.",
        );
        return res.redirect("/admin");
      }
      booking.emailStatus = "Sent";
      booking.emailedAt = new Date();
      await booking.save();
      flash(
        req,
        "success",
        "Booking updated. The email provider accepted the update for the requester.",
      );
    } else {
      flash(
        req,
        "success",
        "Booking updated. The requester can see your comments in their account. No email was sent.",
      );
    }
    res.redirect("/admin");
  } catch (e) {
    return next(e);
  }
});

app.post("/admin/orders/:id", requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate<{
      customer?: { email?: string };
    }>("customer", "email");
    if (!order) return res.status(404).send("Order not found");
    const allowed = [
      "Received",
      "Confirmed",
      "Preparing",
      "Ready for dispatch",
      "Out for delivery",
      "Delivered",
      "Cancelled",
    ];
    if (!allowed.includes(req.body.status))
      return res.status(400).send("Invalid order status");
    if (
      [
        "Preparing",
        "Ready for dispatch",
        "Out for delivery",
        "Delivered",
      ].includes(req.body.status) &&
      order.paymentStatus !== "Paid"
    ) {
      flash(
        req,
        "warning",
        "Payment must be verified before preparing or dispatching this order.",
      );
      return res.redirect("/admin");
    }
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
      order.total = Math.round((food + fee) * 100) / 100;
      order.deliveryFee = Math.round(fee * 100) / 100;
      order.quoted = true;
    }
    order.status = req.body.status as typeof order.status;
    order.deliveryContact = String(req.body.deliveryContact || "").slice(
      0,
      200,
    );
    order.deliveryNotes = String(req.body.deliveryNotes || "").slice(0, 1000);
    await order.save();
    if (req.body.emailOrder === "on") {
      try {
        await bookingMailer.sendOrder(order);
        flash(req, "success", "Order saved and emailed to the requester.");
      } catch (e) {
        flash(
          req,
          "warning",
          "Order saved, but email failed. Check SMTP settings and try again.",
        );
      }
    } else flash(req, "success", "Order updated.");
    res.redirect("/admin");
  } catch (e) {
    return next(e);
  }
});

app.get("/health", (req, res) =>
  res.json({
    ok: true,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
