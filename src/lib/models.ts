import mongoose, {
  type Model,
  type InferSchemaType,
  type Types,
} from "mongoose";
import { isEmail } from "./booking-email";
import { bookingStatuses } from "./constants";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    phone: { type: String, trim: true, maxlength: 30 },
  },
  { timestamps: true },
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quoteOnly: { type: Boolean, default: true },
    category: {
      type: String,
      required: true,
      enum: ["Food", "Event Catering", "Hospitality", "Equipment Hire"],
    },
    description: { type: String, required: true },
    price: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "per order" },
    image: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const adminNotificationSchema = new mongoose.Schema(
  {
    email: { type: String, enum: ["Not configured", "Accepted", "Failed"] },
    whatsapp: { type: String, enum: ["Not configured", "Accepted", "Failed"] },
    attemptedAt: Date,
    whatsappMessageId: String,
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    adminNotifications: adminNotificationSchema,
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requesterName: { type: String, trim: true, maxlength: 100 },
    approverNotificationStatus: {
      type: String,
      enum: ["Not sent", "Sent", "Failed"],
      default: "Not sent",
    },
    type: { type: String, required: true },
    eventDate: { type: Date, required: true },
    guestCount: { type: Number, required: true, min: 1, max: 100000 },
    venue: { type: String, required: true, maxlength: 300 },
    budget: { type: Number, min: 0 },
    menuNeeds: { type: String, maxlength: 3000 },
    notes: { type: String, maxlength: 3000 },
    status: { type: String, enum: bookingStatuses, default: "New" },
    requesterEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: isEmail,
    },
    approverComment: { type: String, maxlength: 3000 },
    proposedDate: Date,
    reviewedAt: Date,
    emailStatus: {
      type: String,
      enum: ["Not sent", "Pending", "Sent", "Failed"],
      default: "Not sent",
    },
    emailedAt: Date,
    quoteAmount: { type: Number, min: 0 },
    adminNotes: { type: String, maxlength: 3000 },
  },
  { timestamps: true },
);

const orderSchema = new mongoose.Schema(
  {
    adminNotifications: adminNotificationSchema,
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    requesterName: String,
    requesterEmail: String,
    phone: String,
    accessToken: { type: String, unique: true, sparse: true },
    quoted: { type: Boolean, default: false },
    deliveryFee: { type: Number, min: 0, default: 0 },
    deliveryContact: String,
    deliveryNotes: String,
    paymentReference: { type: String, unique: true, sparse: true },
    paymentUrl: String,
    paidAt: Date,
    items: [
      {
        service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        name: String,
        quantity: { type: Number, min: 1 },
        unitPrice: Number,
      },
    ],
    deliveryAddress: { type: String, required: true, maxlength: 500 },
    deliveryDate: { type: Date },
    notes: { type: String, maxlength: 2000 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["M-PESA", "Card", "Pay on confirmation"],
      default: "Pay on confirmation",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    status: {
      type: String,
      enum: [
        "Received",
        "Confirmed",
        "Preparing",
        "Ready for dispatch",
        "Out for delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Received",
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

export const User =
  (mongoose.models.User as
    Model<InferSchemaType<typeof userSchema>> | undefined) ||
  mongoose.model("User", userSchema);
export const Service =
  (mongoose.models.Service as
    Model<InferSchemaType<typeof serviceSchema>> | undefined) ||
  mongoose.model("Service", serviceSchema);
export const Booking =
  (mongoose.models.Booking as
    Model<InferSchemaType<typeof bookingSchema>> | undefined) ||
  mongoose.model("Booking", bookingSchema);
export const Order =
  (mongoose.models.Order as
    Model<InferSchemaType<typeof orderSchema>> | undefined) ||
  mongoose.model("Order", orderSchema);
const inquirySchema = new mongoose.Schema(
  {
    requesterName: { type: String, required: true, trim: true, maxlength: 100 },
    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: isEmail,
    },
    subject: { type: String, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    adminNotifications: adminNotificationSchema,
  },
  { timestamps: true },
);
export const Inquiry =
  (mongoose.models.Inquiry as
    Model<InferSchemaType<typeof inquirySchema>> | undefined) ||
  mongoose.model("Inquiry", inquirySchema);

export type UserEntity = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
};
export type ServiceEntity = InferSchemaType<typeof serviceSchema> & {
  _id: Types.ObjectId;
};
export type BookingEntity = InferSchemaType<typeof bookingSchema> & {
  _id: Types.ObjectId;
};
export type OrderEntity = InferSchemaType<typeof orderSchema> & {
  _id: Types.ObjectId;
};
export type InquiryEntity = InferSchemaType<typeof inquirySchema> & {
  _id: Types.ObjectId;
};
