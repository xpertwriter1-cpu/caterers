require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const morgan = require("morgan");
const bcrypt = require("bcryptjs");
const path = require("path");
const crypto = require("node:crypto");
const payments = require("./payments").createPayments();
const { createBookingMailer, isEmail } = require("./booking-email");
const bookingMailer = createBookingMailer();
const { createAdminNotifier } = require("./admin-notifications");
const adminNotifier = createAdminNotifier({ mailer: bookingMailer });
const bookingStatuses = ["New", "Quoted", "Accepted", "Approved", "Reschedule Requested", "Confirmed", "In Progress", "Completed", "Declined", "Cancelled"];

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(helmet({ contentSecurityPolicy: false })); // Enable/tune CSP before production deployment.
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.json({ limit: "100kb", verify: (req, res, body) => { req.rawBody = body; } }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "development-only-change-me",
  resave: false,
  saveUninitialized: false,
  store: process.env.MONGODB_URI ? MongoStore.create({ mongoUrl: process.env.MONGODB_URI }) : undefined,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 }
}));

mongoose.set("strictQuery", true);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  phone: { type: String, trim: true, maxlength: 30 }
}, { timestamps: true });

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  quoteOnly: { type: Boolean, default: true },
  category: { type: String, required: true, enum: ["Food", "Event Catering", "Hospitality", "Equipment Hire"] },
  description: { type: String, required: true },
  price: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: "per order" },
  image: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const adminNotificationSchema = new mongoose.Schema({
  email: { type: String, enum: ["Not configured", "Accepted", "Failed"] },
  whatsapp: { type: String, enum: ["Not configured", "Accepted", "Failed"] },
  attemptedAt: Date,
  whatsappMessageId: String
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  adminNotifications: adminNotificationSchema,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  requesterName: { type: String, trim: true, maxlength: 100 },
  approverNotificationStatus: { type: String, enum: ["Not sent", "Sent", "Failed"], default: "Not sent" },
  type: { type: String, required: true },
  eventDate: { type: Date, required: true },
  guestCount: { type: Number, required: true, min: 1, max: 100000 },
  venue: { type: String, required: true, maxlength: 300 },
  budget: { type: Number, min: 0 },
  menuNeeds: { type: String, maxlength: 3000 },
  notes: { type: String, maxlength: 3000 },
  status: { type: String, enum: bookingStatuses, default: "New" },
  requesterEmail: { type: String, trim: true, lowercase: true, validate: isEmail },
  approverComment: { type: String, maxlength: 3000 },
  proposedDate: Date,
  reviewedAt: Date,
  emailStatus: { type: String, enum: ["Not sent", "Pending", "Sent", "Failed"], default: "Not sent" },
  emailedAt: Date,
  quoteAmount: { type: Number, min: 0 },
  adminNotes: { type: String, maxlength: 3000 }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  adminNotifications: adminNotificationSchema,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  requesterName: String, requesterEmail: String, phone: String,
  accessToken: { type: String, unique: true, sparse: true },
  quoted: { type: Boolean, default: false },
  deliveryFee: { type: Number, min: 0, default: 0 },
  deliveryContact: String, deliveryNotes: String,
  paymentReference: { type: String, unique: true, sparse: true },
  paymentUrl: String, paidAt: Date,
  items: [{ service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" }, name: String, quantity: { type: Number, min: 1 }, unitPrice: Number }],
  deliveryAddress: { type: String, required: true, maxlength: 500 },
  deliveryDate: { type: Date },
  notes: { type: String, maxlength: 2000 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ["M-PESA", "Card", "Pay on confirmation"], default: "Pay on confirmation" },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" },
  status: { type: String, enum: ["Received", "Confirmed", "Preparing", "Ready for dispatch", "Out for delivery", "Delivered", "Cancelled"], default: "Received" }
}, { timestamps: true, optimisticConcurrency: true });

const User = mongoose.model("User", userSchema);
const Service = mongoose.model("Service", serviceSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Order = mongoose.model("Order", orderSchema);
const Inquiry = mongoose.model("Inquiry", new mongoose.Schema({
  requesterName: { type: String, required: true, trim: true, maxlength: 100 },
  requesterEmail: { type: String, required: true, lowercase: true, trim: true, validate: isEmail },
  subject: { type: String, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  adminNotifications: adminNotificationSchema
}, { timestamps: true }));

function flash(req, type, message) { req.session.flash = { type, message }; }
function getFlash(req) { const message = req.session.flash; delete req.session.flash; return message; }
function requireAuth(req, res, next) {
  if (!req.session.user) { flash(req, "warning", "Please sign in to continue."); return res.redirect("/login"); }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    flash(req, "warning", "Administrator access is required.");
    return res.redirect("/login");
  }
  next();
}
app.use(async (req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = getFlash(req);
  res.locals.currency = value => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
  res.locals.year = new Date().getFullYear();
  res.locals.bookingStatuses = bookingStatuses;
  res.locals.emailConfigured = bookingMailer.configured;
  res.locals.adminNotificationConfig = adminNotifier.configured;
  next();
});

const starterServices = [
  { name: "Kienyeji Chicken Feast", category: "Food", description: "Traditional kienyeji chicken prepared for family gatherings and celebrations. Serving size, preparation and availability are confirmed on request.", price: 0, quoteOnly: true, unit: "request a quote", image: "/images/kienyeji-chicken.jpg" },
  { name: "Traditional Kenyan Buffet", category: "Event Catering", description: "A custom spread inspired by Kenyan favourites such as nyama choma, pilau, chapati, mukimo, sukuma wiki and seasonal accompaniments.", price: 0, quoteOnly: true, unit: "per event quotation", image: "/images/kenyan-food-spread.jpg" },
  { name: "Wedding & Dowry Ceremony Catering", category: "Event Catering", description: "Catering planning for weddings, ruracio and dowry ceremonies, family celebrations and receptions.", price: 0, quoteOnly: true, unit: "custom quotation", image: "/images/elegant-event-tables.jpg" },
  { name: "Corporate & Conference Catering", category: "Event Catering", description: "Food and hospitality support for corporate functions, workshops, meetings and conferences in Nairobi and surrounding areas, subject to availability.", price: 0, quoteOnly: true, unit: "custom quotation", image: "/images/elegant-event-tables.jpg" },
  { name: "Tea, Snacks & Office Meals", category: "Food", description: "Request tea breaks, snacks, lunch and meal delivery for teams, meetings and gatherings. Menu and delivery arrangements are confirmed with you.", price: 0, quoteOnly: true, unit: "request a quote", image: "/images/refreshments.jpg" },
  { name: "Event Planning & Hospitality Team", category: "Hospitality", description: "Event coordination and hospitality support for private and cultural celebrations. Share your event plan to discuss the scope and availability.", price: 0, quoteOnly: true, unit: "custom quotation", image: "/images/nanny-event-team.jpg" }
];

async function seedDatabase() {
  if (!await Service.countDocuments()) await Service.insertMany(starterServices);
  else {
    // Add the Nanny catalogue without overwriting owner-edited services, and hide generic starter entries from the old demo.
    await Service.updateMany({ name: { $in: ["Office Lunch Box", "Celebration Buffet", "Corporate Event Catering", "Hospitality Service Team", "Tea & Snack Break", "Tables & Catering Equipment"] } }, { $set: { active: false } });
    for (const item of starterServices) {
      const { image, quoteOnly, price, ...insertFields } = item;
      await Service.updateOne({ name: item.name }, { $setOnInsert: insertFields, $set: { image, quoteOnly, price } }, { upsert: true });
    }
  }
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (adminEmail && adminPassword && adminPassword !== "ChangeThisPassword123!") {
    const exists = await User.findOne({ email: adminEmail });
    if (!exists) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.create({ name: process.env.ADMIN_NAME || "Site Administrator", email: adminEmail, passwordHash, role: "admin" });
      console.log(`Admin account created for ${adminEmail}`);
    }
  } else {
    console.warn("Admin account not seeded. Set a unique ADMIN_EMAIL and strong ADMIN_PASSWORD in .env before startup.");
  }
}

app.get("/", async (req, res, next) => {
  try {
    const services = await Service.find({ active: true }).sort({ createdAt: -1 }).limit(6);
    res.render("home", { title: "Nairobi Catering, Events & Hospitality", services });
  } catch (e) { next(e); }
});

app.get("/services", async (req, res, next) => {
  try {
    const filter = {};
    if (["Food", "Event Catering", "Hospitality", "Equipment Hire"].includes(req.query.category)) filter.category = req.query.category;
    const services = await Service.find({ ...filter, active: true }).sort({ category: 1, name: 1 });
    res.render("services", { title: "Our Services", services, selectedCategory: req.query.category || "" });
  } catch (e) { next(e); }
});

app.get("/about", (req, res) => res.render("about", { title: "About Nanny Events & Caterers" }));
app.get("/contact", (req, res) => res.render("contact", { title: "Contact Nanny Events & Caterers" }));
app.post("/contact", async (req, res, next) => {
  try {
    const text = key => typeof req.body[key] === "string" ? req.body[key].trim() : "";
    const name = text("name"), email = text("email").toLowerCase();
    const subject = text("subject"), message = text("message");
    if (!name || name.length > 100 || !isEmail(email) || !message || message.length > 3000 || subject.length > 150) {
      flash(req, "danger", "Enter your name (up to 100 characters), a valid email, subject (up to 150 characters) and message (up to 3000 characters).");
      return res.redirect("/contact");
    }
    const inquiry = await Inquiry.create({ requesterName: name, requesterEmail: email, subject, message });
    inquiry.adminNotifications = await adminNotifier.notify("inquiry", inquiry);
    await inquiry.save();
    flash(req, "success", "Thank you. Your enquiry has been saved for our team to review. We will reply using the email you provided.");
    res.redirect("/contact");
  } catch (error) { next(error); }
});

app.get("/register", (req, res) => res.render("auth", { title: "Create Account", mode: "register" }));
app.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");
    if (!name || !email || password.length < 10) {
      flash(req, "danger", "Enter your name and email, and use a password of at least 10 characters.");
      return res.redirect("/register");
    }
    if (await User.findOne({ email })) { flash(req, "danger", "An account with that email already exists."); return res.redirect("/register"); }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, passwordHash });
    req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    flash(req, "success", "Welcome! Your account is ready.");
    res.redirect("/account");
  } catch (e) { next(e); }
});

app.get("/login", (req, res) => res.render("auth", { title: "Sign In", mode: "login", audience: "guest" }));
app.get("/admin/login", (req, res) => res.render("auth", { title: "Admin Sign In", mode: "login", audience: "admin" }));
const handleLogin = requiredRole => async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      flash(req, "danger", "Email or password was not recognised.");
      return res.redirect(requiredRole === "admin" ? "/admin/login" : "/login");
    }
    if (requiredRole && user.role !== requiredRole) {
      flash(req, "danger", "This sign-in is for administrators. Use the guest sign-in instead.");
      return res.redirect("/admin/login");
    }
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      flash(req, "success", `Welcome back, ${user.name}.`);
      res.redirect(user.role === "admin" ? "/admin" : "/account");
    });
  } catch (e) { next(e); }
};
app.post("/login", handleLogin());
app.post("/admin/login", handleLogin("admin"));
app.post("/logout", (req, res, next) => req.session.destroy(err => {
  if (err) return next(err);
  res.clearCookie("connect.sid");
  res.redirect("/");
}));

app.get("/book", (req, res) => res.render("book", { title: "Book Catering or Request a Quote" }));
app.post("/book", async (req, res, next) => {
  try {
    const { type, eventDate, guestCount, venue, budget, menuNeeds, notes } = req.body;
    const requesterEmail = String(req.body.requesterEmail || "").trim().toLowerCase();
    const requesterName = String(req.body.requesterName || "").trim();
    if (!requesterName || requesterName.length > 100) {
      flash(req, "danger", "Please enter your name (up to 100 characters).");
      return res.redirect("/book");
    }
    if (!isEmail(requesterEmail)) {
      flash(req, "danger", "Please enter a valid requester email address for booking updates.");
      return res.redirect("/book");
    }
    const date = new Date(eventDate);
    if (!type || !eventDate || Number.isNaN(date.getTime()) || date < new Date(new Date().toDateString()) ||
        !Number.isInteger(Number(guestCount)) || Number(guestCount) < 1 || !venue) {
      flash(req, "danger", "Please provide a valid future event date, guest count, event type and venue.");
      return res.redirect("/book");
    }
    const booking = await Booking.create({
      customer: req.session.user?.id, requesterName, requesterEmail, type, eventDate: date, guestCount: Number(guestCount), venue,
      budget: budget ? Number(budget) : undefined, menuNeeds, notes
    });
    booking.adminNotifications = await adminNotifier.notify("booking", booking);
    booking.approverNotificationStatus = booking.adminNotifications.email === "Accepted" ? "Sent" : "Failed";
    await booking.save();
    flash(req, "success", `Booking request ${booking._id.toString().slice(-6).toUpperCase()} submitted. Our team will review it and reply to ${requesterEmail}. No account is needed.`);
    res.redirect("/book");
  } catch (e) { next(e); }
});

app.get("/order/:id", async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, active: true });
    if (!service) return res.status(404).render("404", { title: "Item Not Found" });
    res.render("order", { title: "Order " + service.name, service });
  } catch (e) { next(e); }
});
app.post("/order/:id", async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, active: true });
    if (!service) return res.status(404).render("404", { title: "Item Not Found" });
    const quantity = Number(req.body.quantity);
    const requesterName = String(req.body.requesterName || "").trim();
    const requesterEmail = String(req.body.requesterEmail || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const address = String(req.body.deliveryAddress || "").trim();
    const date = req.body.deliveryDate ? new Date(req.body.deliveryDate) : undefined;
    if (!requesterName || requesterName.length > 100 || !isEmail(requesterEmail) || !/^[+\d ()-]{9,30}$/.test(phone) ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 5000 || !address || address.length > 500 ||
        (date && (Number.isNaN(date.getTime()) || date < new Date())) || !["M-PESA", "Card"].includes(req.body.paymentMethod)) {
      flash(req, "danger", "Enter your name, valid email, phone, quantity, delivery details and payment method.");
      return res.redirect("/order/" + service._id);
    }
    const order = await Order.create({
      customer: req.session.user?.id, requesterName, requesterEmail, phone,
      accessToken: crypto.randomBytes(32).toString("hex"),
      items: [{ service: service._id, name: service.name, quantity, unitPrice: service.price }],
      deliveryAddress: address, deliveryDate: date, notes: String(req.body.notes || "").slice(0,2000),
      total: service.quoteOnly ? 0 : service.price * quantity, paymentMethod: req.body.paymentMethod
    });
    order.adminNotifications = await adminNotifier.notify("order", order);
    await order.save();
    flash(req, "success", "Request received. Our team will confirm availability, food price and delivery fee before payment.");
    res.redirect("/requests/" + order.accessToken);
  } catch (e) { next(e); }
});

app.get("/requests/:token", async (req, res, next) => {
  try {
    const order = /^[a-f0-9]{64}$/.test(req.params.token) ? await Order.findOne({accessToken:req.params.token}) : null;
    if (!order) return res.status(404).render("404", {title:"Request not found"});
    res.set("Cache-Control", "no-store"); res.set("Referrer-Policy", "no-referrer");
    res.render("request", {title:"Your order request", order, paymentsConfigured:payments.configured});
  } catch (e) {next(e);}
});
app.post("/requests/:token/pay", async (req,res,next) => {
  try {
    const order = await Order.findOne({accessToken:req.params.token});
    if (!order || !order.quoted || order.total <= 0 || order.paymentStatus === "Paid" || order.status === "Cancelled") {
      return res.status(400).send("This order is not available for payment.");
    }
    if (!payments.configured) {flash(req,"warning","Online payments are not configured yet. Please contact our team.");return res.redirect("/requests/"+order.accessToken);}
    if (!order.paymentReference) {
      await Order.updateOne({_id:order._id,paymentReference:{$exists:false},status:{$ne:"Cancelled"}},{$set:{paymentReference:"nanny-"+crypto.randomBytes(16).toString("hex")},$inc:{__v:1}});
    }
    const current = await Order.findById(order._id);
    if (!current.paymentReference || current.status === "Cancelled" || current.paymentStatus === "Paid") return res.redirect("/requests/"+current.accessToken);
    if (!current.paymentUrl) {
      const result = await payments.initialize(current);
      if (!/^https:\/\/checkout\.paystack\.com\//.test(result.authorization_url)) throw new Error("Invalid checkout URL");
      current.paymentUrl = result.authorization_url; await current.save();
    }
    res.redirect(303,current.paymentUrl);
  } catch(e) {flash(req,"warning","Unable to start payment. Please try again or contact our team.");res.redirect("/requests/"+req.params.token);}
});
app.get("/requests/:token/verify", async (req,res,next) => {
  try {
    const order = await Order.findOne({accessToken:req.params.token});
    if (!order) return res.status(404).send("Order not found");
    if (order.paymentStatus !== "Paid" && await payments.verify(order)) {
      await Order.updateOne({_id:order._id,paymentStatus:{$ne:"Paid"}},{$set:{paymentStatus:"Paid",paidAt:new Date()}});
    }
    flash(req,"success",order.paymentStatus === "Paid" ? "Payment already confirmed." : "Payment checked. See the current status below; pending payments can be checked again.");
    res.redirect("/requests/"+order.accessToken);
  } catch(e) {flash(req,"warning","Payment could not be checked yet. Please try again.");res.redirect("/requests/"+req.params.token);}
});
app.post("/payments/paystack/webhook", async (req,res,next) => {
  if (!req.rawBody || !payments.validSignature(req.rawBody,req.get("x-paystack-signature"))) return res.sendStatus(401);
  try {
    if(req.body.event === "charge.success") {
      if(typeof req.body.data?.reference !== "string") return res.sendStatus(400);
      const order = await Order.findOne({paymentReference:req.body.data.reference});
      if(order && order.paymentStatus !== "Paid" && await payments.verify(order)) {
        await Order.updateOne({_id:order._id,paymentStatus:{$ne:"Paid"}},{$set:{paymentStatus:"Paid",paidAt:new Date()}});
      }
    }
    res.sendStatus(200);
  } catch(e) {res.sendStatus(503);}
});

app.get("/account", requireAuth, async (req, res, next) => {
  try {
    const [bookings, orders] = await Promise.all([
      Booking.find({ customer: req.session.user.id }).sort({ createdAt: -1 }),
      Order.find({ customer: req.session.user.id }).sort({ createdAt: -1 })
    ]);
    res.render("account", { title: "My Account", bookings, orders });
  } catch (e) { next(e); }
});

app.get("/admin", requireAdmin, async (req, res, next) => {
  try {
    const [bookings, orders, services, customers, stats, inquiries] = await Promise.all([
      Booking.find().populate("customer", "name email phone").sort({ createdAt: -1 }).limit(100),
      Order.find().populate("customer", "name email phone").sort({ createdAt: -1 }).limit(100),
      Service.find().sort({ createdAt: -1 }),
      User.countDocuments({ role: "customer" }),
      Promise.all([Booking.countDocuments(), Order.countDocuments(), Order.aggregate([{ $match: { paymentStatus: "Paid" } }, { $group: { _id: null, total: { $sum: "$total" } } }])]),
      Inquiry.find().sort({ createdAt: -1 }).limit(100)
    ]);
    res.render("admin", { title: "Admin Dashboard", bookings, orders, services, customers, inquiries, stats: { bookingCount: stats[0], orderCount: stats[1], paidTotal: stats[2][0]?.total || 0 } });
  } catch (e) { next(e); }
});

app.post("/admin/notifications/:kind/:id/retry", requireAdmin, async (req, res, next) => {
  try {
    const Model = req.params.kind === "booking" ? Booking : req.params.kind === "order" ? Order : req.params.kind === "inquiry" ? Inquiry : null;
    if (!Model || !mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
    const record = await Model.findById(req.params.id);
    if (!record) return res.sendStatus(404);
    record.adminNotifications = await adminNotifier.notify(req.params.kind, record, true);
    if (req.params.kind === "booking") record.approverNotificationStatus = record.adminNotifications.email === "Accepted" ? "Sent" : "Failed";
    await record.save();
    const accepted = record.adminNotifications.email === "Accepted" && record.adminNotifications.whatsapp === "Accepted";
    flash(req, accepted ? "success" : "warning", accepted ? "Admin alerts accepted by both providers." : "Admin alert retry completed. Check each channel's status and configuration.");
    res.redirect("/admin");
  } catch (error) { next(error); }
});

app.post("/admin/services", requireAdmin, async (req, res, next) => {
  try {
    const { name, category, description, price, unit, image } = req.body;
    if (!name || !description || !["Food", "Event Catering", "Hospitality", "Equipment Hire"].includes(category) || !Number.isFinite(Number(price)) || Number(price) < 0) {
      flash(req, "danger", "Please provide valid service details and price.");
      return res.redirect("/admin");
    }
    await Service.create({ name, category, description, price: Number(price), unit: unit || "per order", image: image || "" });
    flash(req, "success", "Service added.");
    res.redirect("/admin");
  } catch (e) { next(e); }
});

app.post("/admin/services/:id/toggle", requireAdmin, async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (service) { service.active = !service.active; await service.save(); }
    flash(req, "success", "Service availability updated.");
    res.redirect("/admin");
  } catch (e) { next(e); }
});

app.post("/admin/bookings/:id", requireAdmin, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("customer", "email");
    if (!booking) { flash(req, "danger", "Booking not found."); return res.redirect("/admin"); }
    const comment = String(req.body.approverComment || "").trim();
    const proposedDate = req.body.proposedDate ? new Date(req.body.proposedDate) : null;
    const sendEmail = req.body.sendEmail === "on";
    const recipient = booking.requesterEmail || booking.customer?.email;
    if (!bookingStatuses.includes(req.body.status) || comment.length > 3000 ||
        (proposedDate && Number.isNaN(proposedDate.getTime())) ||
        (req.body.status === "Reschedule Requested" && (!proposedDate || proposedDate < new Date(new Date().toISOString().slice(0, 10)) || !comment))) {
      flash(req, "danger", "Choose a valid status. Rescheduling requires a future proposed date and a comment.");
      return res.redirect("/admin");
    }
    if (sendEmail && (!bookingMailer.configured || !isEmail(recipient))) {
      flash(req, "danger", "Email was not sent and changes were not saved. Configure SMTP and check the requester email, or use Save without emailing.");
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
    booking.proposedDate = booking.status === "Reschedule Requested" ? proposedDate : undefined;
    booking.reviewedAt = new Date();
    booking.emailStatus = sendEmail ? "Pending" : "Not sent";
    booking.emailedAt = undefined;
    await booking.save();
    if (sendEmail) {
      try {
        await bookingMailer.send(booking, recipient);
      } catch (error) {
        booking.emailStatus = "Failed";
        await booking.save();
        flash(req, "warning", "Booking and comments saved, but email failed. Check the email configuration and try Save and email again.");
        return res.redirect("/admin");
      }
      booking.emailStatus = "Sent";
      booking.emailedAt = new Date();
      await booking.save();
      flash(req, "success", "Booking updated. The email provider accepted the update for the requester.");
    } else {
      flash(req, "success", "Booking updated. The requester can see your comments in their account. No email was sent.");
    }
    res.redirect("/admin");
  } catch (e) { next(e); }
});

app.post("/admin/orders/:id", requireAdmin, async (req,res,next) => {
  try {
    const order = await Order.findById(req.params.id).populate("customer","email");
    if(!order) return res.status(404).send("Order not found");
    const allowed = ["Received","Confirmed","Preparing","Ready for dispatch","Out for delivery","Delivered","Cancelled"];
    if(!allowed.includes(req.body.status)) return res.status(400).send("Invalid order status");
    if(["Preparing","Ready for dispatch","Out for delivery","Delivered"].includes(req.body.status) && order.paymentStatus !== "Paid") {
      flash(req,"warning","Payment must be verified before preparing or dispatching this order."); return res.redirect("/admin");
    }
    if(!order.paymentReference && order.paymentStatus !== "Paid" && req.body.foodTotal !== undefined && req.body.foodTotal !== "") {
      const food = Number(req.body.foodTotal), fee = Number(req.body.deliveryFee || 0);
      if(!Number.isFinite(food) || food <= 0 || !Number.isFinite(fee) || fee < 0 || food+fee > 10000000) return res.status(400).send("Enter valid food and delivery amounts");
      order.total = Math.round((food+fee)*100)/100; order.deliveryFee = Math.round(fee*100)/100; order.quoted = true;
    }
    order.status = req.body.status;
    order.deliveryContact = String(req.body.deliveryContact || "").slice(0,200);
    order.deliveryNotes = String(req.body.deliveryNotes || "").slice(0,1000);
    await order.save();
    if(req.body.emailOrder === "on") {
      try {await bookingMailer.sendOrder(order);flash(req,"success","Order saved and emailed to the requester.");}
      catch(e) {flash(req,"warning","Order saved, but email failed. Check SMTP settings and try again.");}
    } else flash(req,"success","Order updated.");
    res.redirect("/admin");
  } catch(e) {next(e);}
});

app.get("/health", (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

app.use((req, res) => res.status(404).render("404", { title: "Page Not Found" }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.code === 11000) {
    flash(req, "danger", "That email address is already registered.");
    return res.redirect("/register");
  }
  res.status(500).render("error", { title: "Something Went Wrong", message: process.env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message });
});

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Copy .env.example to .env and configure MongoDB Atlas.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");
  await seedDatabase();
  app.listen(PORT, () => console.log(`Nanny Events & Caterers is running at http://localhost:${PORT}`));
}
start().catch(err => { console.error("Startup failed:", err.message); process.exit(1); });
