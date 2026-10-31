import type {
  BookingEntity,
  InquiryEntity,
  OrderEntity,
  ServiceEntity,
} from "./models";

export type Environment = Record<string, string | undefined>;
export type NotificationKind = "booking" | "order" | "inquiry";
export interface AdminNotifications {
  email: "Not configured" | "Accepted" | "Failed";
  whatsapp: "Not configured" | "Accepted" | "Failed";
  attemptedAt?: Date;
  whatsappMessageId?: string | null;
}
export interface NotificationRecord {
  id: { toString(): string };
  requesterName?: string | null;
  requesterEmail?: string | null;
  customer?: { email?: string | null } | null;
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
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
type View<T> = {
  [K in keyof T as null extends T[K] ? never : K]: Serialized<T[K]>;
} & { [K in keyof T as null extends T[K] ? K : never]?: Serialized<T[K]> };
type Contact = { name?: string; email?: string; phone?: string | null };
export type BookingView = Omit<View<BookingEntity>, "customer"> & {
  customer?: Contact | null;
};
export type OrderView = Omit<View<OrderEntity>, "customer"> & {
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
  services: View<ServiceEntity>[];
  service?: View<ServiceEntity>;
  bookings: BookingView[];
  orders: OrderView[];
  order?: OrderView;
  inquiries: View<InquiryEntity>[];
  customers: number;
  users: { id: string; name: string; email: string; role: string; verified: boolean; primaryAdmin: boolean }[];
  verificationEmail?: string;
  stats: { bookingCount: number; orderCount: number; paidTotal: number };
  selectedCategory: string;
  mode: "login" | "register" | "verify";
  paymentsConfigured: boolean;
  message: string;
}
export const currency = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
