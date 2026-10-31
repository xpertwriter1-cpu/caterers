import nodemailer from "nodemailer";
import type { Environment, NotificationRecord } from "./types";
import { adminEmails } from "./admin-access";

export function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@<> ,;]+@[^\s@<> ,;]+\.[^\s@<> ,;]+$/.test(value)
  );
}

export function createBookingMailer(env: Environment = process.env) {
  env = {
    ...env,
    SMTP_HOST: env.SMTP_HOST || env.MAIL_HOST,
    SMTP_PORT: env.SMTP_PORT || env.MAIL_PORT,
    SMTP_USER: env.SMTP_USER || env.MAIL_USERNAME,
    SMTP_PASS: env.SMTP_PASS || env.MAIL_PASSWORD,
    SMTP_FROM: env.SMTP_FROM || env.MAIL_FROM_ADDRESS,
  };
  const configured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  const port = Number(env.SMTP_PORT || 465);
  const transport = configured
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        disableFileAccess: true,
        disableUrlAccess: true,
      })
    : null;
  return {
    configured,
    async sendVerification(recipient: string, code: string) {
      if (!transport || !isEmail(recipient)) throw new Error("Verification email is not configured.");
      const result = await transport.sendMail({
        from: { name: "Nanny Events & Caterers", address: env.SMTP_FROM || env.SMTP_USER },
        to: { address: recipient },
        subject: "Verify your Nanny Events & Caterers account",
        text: `Your email verification code is ${code}.\n\nIt expires in 15 minutes. Enter it on the website to verify your account, then sign in.\nIf you did not request this, ignore this email.`,
      });
      if (!result.accepted?.length) throw new Error("Verification email was not accepted.");
    },
    async notifyInquiry(inquiry: NotificationRecord) {
      const recipients = adminEmails(env);
      if (!transport || !recipients.length)
        throw new Error("Admin email is not configured.");
      const result = await transport.sendMail({
        from: {
          name: "Nanny Events & Caterers",
          address: env.SMTP_FROM || env.SMTP_USER,
        },
        to: recipients.map((address) => ({ address })),
        replyTo: { address: inquiry.requesterEmail || undefined },
        subject: `New contact enquiry #${inquiry.id.toString().slice(-6).toUpperCase()}`,
        text: [
          "A new contact enquiry needs your review.",
          `Requester: ${inquiry.requesterName}`,
          `Email: ${inquiry.requesterEmail}`,
          `Subject: ${inquiry.subject || "General enquiry"}`,
          "",
          inquiry.message,
          "",
          env.PUBLIC_BASE_URL
            ? `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/admin`
            : "Sign in to the website's admin dashboard.",
          "Reply to this email to contact the requester.",
        ].join("\n"),
      });
      if ((result.accepted?.length || 0) < recipients.length) throw new Error("Email was not accepted for every admin.");
    },
    async notifyOrder(order: NotificationRecord) {
      const recipients = adminEmails(env);
      if (!transport || !recipients.length)
        throw new Error("Admin email is not configured.");
      const result = await transport.sendMail({
        from: {
          name: "Nanny Events & Caterers",
          address: env.SMTP_FROM || env.SMTP_USER,
        },
        to: recipients.map((address) => ({ address })),
        replyTo: { address: order.requesterEmail || undefined },
        subject: `New order / quotation request #${order.id.toString().slice(-6).toUpperCase()}`,
        text: [
          "A new food / catering request needs your review.",
          `Requester: ${order.requesterName}`,
          `Email: ${order.requesterEmail}`,
          `Phone: ${order.phone}`,
          `Items: ${(order.items || []).map((i) => `${i.name} x ${i.quantity}`).join(", ")}`,
          `Delivery: ${order.deliveryAddress}`,
          order.deliveryDate
            ? `Requested delivery: ${new Date(order.deliveryDate).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}`
            : "Delivery time: to be confirmed",
          `Notes: ${order.notes || "None"}`,
          "Confirm availability and prepare the quotation in the admin dashboard.",
          env.PUBLIC_BASE_URL
            ? `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/admin`
            : "Sign in to the website's admin dashboard.",
        ].join("\n"),
      });
      if ((result.accepted?.length || 0) < recipients.length) throw new Error("Email was not accepted for every admin.");
    },
    async sendOrder(order: NotificationRecord, notificationRecipient?: string) {
      const recipient =
        notificationRecipient ||
        order.requesterEmail ||
        (order.customer && "email" in order.customer
          ? order.customer.email
          : undefined);
      if (
        !transport ||
        !isEmail(recipient) ||
        !order.accessToken ||
        !env.PUBLIC_BASE_URL
      )
        throw new Error("Order email is not configured.");
      const result = await transport.sendMail({
        from: {
          name: "Nanny Events & Caterers",
          address: env.SMTP_FROM || env.SMTP_USER,
        },
        to: { address: recipient },
        replyTo: env.SMTP_REPLY_TO || env.SMTP_USER,
        subject: `Order #${order.id.toString().slice(-6).toUpperCase()}: ${order.status}`,
        text: [
          "Your food / catering request has been updated.",
          `Status: ${order.status}`,
          `Items: ${(order.items || []).map((i) => `${i.name} x ${i.quantity}`).join(", ")}`,
          order.quoted
            ? `Total: KES ${order.total} (includes delivery KES ${order.deliveryFee})`
            : "Quotation pending",
          `Payment: ${order.paymentStatus}`,
          `Delivery: ${order.deliveryAddress}`,
          `Delivery contact: ${order.deliveryContact || "To be assigned"}`,
          order.deliveryNotes || "",
          "Payment is required before preparation and dispatch.",
          `View your order and pay: ${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/requests/${order.accessToken}`,
          "Keep this private link safe. No account is needed.",
        ].join("\n"),
      });
      if (!result.accepted?.length) throw new Error("Email was not accepted.");
    },
    async notifyApprover(booking: NotificationRecord) {
      const recipients = adminEmails(env);
      if (!transport || !recipients.length)
        throw new Error("Approver email is not configured.");
      const reference = booking.id.toString().slice(-6).toUpperCase();
      const result = await transport.sendMail({
        from: {
          name: "Nanny Events & Caterers",
          address: env.SMTP_FROM || env.SMTP_USER,
        },
        to: recipients.map((address) => ({ address })),
        replyTo: { address: booking.requesterEmail || undefined },
        subject: `New booking request #${reference}`,
        text: [
          `New booking #${reference}`,
          `Requester: ${booking.requesterName}`,
          `Email: ${booking.requesterEmail}`,
          `Event: ${booking.type}`,
          `Date: ${new Date(booking.eventDate!).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}`,
          `Guests: ${booking.guestCount}`,
          `Venue: ${booking.venue}`,
          `Budget: ${booking.budget == null ? "Not specified" : `KES ${booking.budget}`}`,
          `Requirements: ${booking.menuNeeds || "None specified"}`,
          `Notes: ${booking.notes || "None"}`,
          "Sign in to the website's admin dashboard to review and send a decision, or reply to this email to contact the requester.",
        ].join("\n"),
      });
      if ((result.accepted?.length || 0) < recipients.length)
        throw new Error("The email provider did not accept the notification.");
    },
    async send(booking: NotificationRecord, recipient: string) {
      if (!transport) throw new Error("Email is not configured.");
      if (!isEmail(recipient))
        throw new Error("A valid requester email is required.");
      const date = (value: Date | string) =>
        new Date(value).toLocaleDateString("en-KE", {
          timeZone: "Africa/Nairobi",
        });
      const reference = booking.id.toString().slice(-6).toUpperCase();
      const text = [
        `Your booking #${reference} has been reviewed.`,
        `Event: ${booking.type}`,
        `Event date: ${date(booking.eventDate!)}`,
        `Status: ${booking.status}`,
        booking.proposedDate
          ? `Proposed new date: ${date(booking.proposedDate)}`
          : "",
        booking.quoteAmount != null ? `Quote: KES ${booking.quoteAmount}` : "",
        "",
        "Approver comments:",
        booking.approverComment || "No additional comments.",
        "",
        "You can reply to this email with any questions. No account is needed.",
        "For a reschedule, please reply to confirm whether the proposed date works for you.",
        "",
        "Nanny Events & Caterers",
      ]
        .filter((line) => line !== "")
        .join("\n");
      const result = await transport.sendMail({
        from: {
          name: "Nanny Events & Caterers",
          address: env.SMTP_FROM || env.SMTP_USER,
        },
        to: { address: recipient },
        replyTo: env.SMTP_REPLY_TO || env.SMTP_FROM || env.SMTP_USER,
        subject: `Booking #${reference}: ${booking.status}`,
        text,
      });
      if (!result.accepted?.length)
        throw new Error("The email provider did not accept the message.");
    },
  };
}
