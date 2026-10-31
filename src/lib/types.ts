import type {
  BookingEntity,
  InquiryEntity,
  OrderEntity,
  ServiceEntity,
} from "./models";
import type { Types } from "mongoose";

export type Environment = Record<string, string | undefined>;
export type NotificationKind = "booking" | "order" | "inquiry";
export interface AdminNotifications {
  email: "Not configured" | "Accepted" | "Failed";
  whatsapp: "Not configured" | "Accepted" | "Failed";
  attemptedAt?: Date;
  whatsappMessageId?: string | null;
}
export interface NotificationRecord {
  _id: { toString(): string };
  requesterName?: string | null;
  requesterEmail?: string | null;
  customer?: { email?: string | null } | Types.ObjectId | null;
  subject?: string | null;
  message?: string | null;
  type?: string;
  eventDate?: Date | string;
  guestCount?: number;
  venue?: string;
  budget?: number | null;
  menuNeeds?: string | null;
  notes?: string | null;
  status?: string;
  approverComment?: string | null;
  proposedDate?: Date | string | null;
  quoteAmount?: number | null;
  phone?: string | null;
  items?: { name?: string | null; quantity?: number | null }[];
  deliveryAddress?: string;
  deliveryDate?: Date | string | null;
  deliveryContact?: string | null;
  deliveryNotes?: string | null;
  total?: number;
  deliveryFee?: number;
  quoted?: boolean;
  accessToken?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string;
  paymentStatus?: string;
  adminNotifications?: {
    email?: string | null;
    whatsapp?: string | null;
    whatsappMessageId?: string | null;
  } | null;
}
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
export interface Flash {
  type: string;
  message: string;
}
export interface SessionData {
  user?: SessionUser;
  flash?: Flash;
}

export type Serialized<T> = T extends Date
  ? string
  : T extends Types.ObjectId
    ? string
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;
type Contact = { name?: string; email?: string; phone?: string };
export type BookingView = Omit<Serialized<BookingEntity>, "customer"> & {
  customer?: Contact | null;
};
export type OrderView = Omit<Serialized<OrderEntity>, "customer"> & {
  customer?: Contact | null;
};
export type ViewName =
  | "home"
  | "services"
  | "about"
  | "contact"
  | "auth"
  | "book"
  | "order"
  | "request"
  | "account"
  | "admin"
  | "404"
  | "error";
export interface PageData {
  view: ViewName;
  title: string;
  currentUser: SessionUser | null;
  flash: Flash | null;
  year: number;
  bookingStatuses: string[];
  emailConfigured: boolean;
  adminNotificationConfig: { email: boolean; whatsapp: boolean };
  services: Serialized<ServiceEntity>[];
  service?: Serialized<ServiceEntity>;
  bookings: BookingView[];
  orders: OrderView[];
  order?: OrderView;
  inquiries: Serialized<InquiryEntity>[];
  customers: number;
  stats: { bookingCount: number; orderCount: number; paidTotal: number };
  selectedCategory: string;
  mode: "login" | "register";
  audience: "admin" | "guest";
  paymentsConfigured: boolean;
  message: string;
}
export const currency = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
