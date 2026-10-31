import { isEmail, type createBookingMailer } from "./booking-email";
import type {
  AdminNotifications,
  Environment,
  NotificationKind,
  NotificationRecord,
} from "./types";

export function createAdminNotifier({
  mailer,
  env = process.env,
  fetchImpl = globalThis.fetch,
}: {
  mailer: Pick<ReturnType<typeof createBookingMailer>, "configured"> &
    Partial<ReturnType<typeof createBookingMailer>>;
  env?: Environment;
  fetchImpl?: typeof fetch;
}) {
  const phone = (value: string | undefined) =>
    /^\+[1-9]\d{7,14}$/.test(value || "");
  let dashboard: string | undefined;
  try {
    const url = new URL(env.PUBLIC_BASE_URL || "");
    if (url.protocol === "https:" && !url.username && !url.password)
      dashboard = new URL("/admin", url).href;
  } catch {
    /* Configuration is shown in the dashboard. */
  }
  const configured = {
    email: Boolean(
      mailer.configured &&
      isEmail(
        env.ADMIN_NOTIFICATION_EMAIL ||
          env.BOOKING_APPROVER_EMAIL ||
          env.ADMIN_EMAIL,
      ),
    ),
    whatsapp: Boolean(
      /^AC[a-f0-9]{32}$/i.test(env.TWILIO_ACCOUNT_SID || "") &&
      env.TWILIO_AUTH_TOKEN &&
      /^HX[a-f0-9]{32}$/i.test(env.TWILIO_WHATSAPP_CONTENT_SID || "") &&
      phone(env.TWILIO_WHATSAPP_FROM) &&
      phone(env.ADMIN_WHATSAPP_NUMBER) &&
      dashboard,
    ),
  };
  async function whatsapp(kind: NotificationKind, record: NotificationRecord) {
    const summary =
      kind === "order"
        ? (record.items || [])
            .map((i) => `${i.name} x ${i.quantity}`)
            .join(", ")
        : kind === "inquiry"
          ? `${record.requesterName}: ${record.subject || "General enquiry"}. ${record.message}`
          : `${record.type}, ${record.guestCount} guests`;
    const body = new URLSearchParams({
      From: `whatsapp:${env.TWILIO_WHATSAPP_FROM}`,
      To: `whatsapp:${env.ADMIN_WHATSAPP_NUMBER}`,
      ContentSid: env.TWILIO_WHATSAPP_CONTENT_SID!,
      ContentVariables: JSON.stringify({
        "1":
          kind === "order"
            ? "Order / quotation request"
            : kind === "inquiry"
              ? "Contact enquiry"
              : "Event quotation request",
        "2": record.id.toString().slice(-6).toUpperCase(),
        "3": summary.replace(/\s+/g, " ").trim().slice(0, 400) || "New request",
        "4": dashboard,
      }),
    });
    const response = await fetchImpl(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = await response.json();
    if (
      !response.ok ||
      !data.sid ||
      ["failed", "undelivered", "canceled"].includes(data.status)
    )
      throw new Error("WhatsApp provider rejected the alert.");
    return data.sid;
  }
  return {
    configured,
    async notify(
      kind: NotificationKind,
      record: NotificationRecord,
      retry = false,
    ) {
      const result: AdminNotifications = {
        email: "Not configured",
        whatsapp: "Not configured",
        attemptedAt: new Date(),
      };
      await Promise.all(
        (["email", "whatsapp"] as const).map(async (channel) => {
          if (retry && record.adminNotifications?.[channel] === "Accepted") {
            result[channel] = "Accepted";
            if (channel === "whatsapp")
              result.whatsappMessageId =
                record.adminNotifications.whatsappMessageId;
            return;
          }
          if (!configured[channel]) return;
          try {
            if (channel === "email") {
              if (kind === "order") await mailer.notifyOrder!(record);
              else if (kind === "inquiry") await mailer.notifyInquiry!(record);
              else await mailer.notifyApprover!(record);
            } else result.whatsappMessageId = await whatsapp(kind, record);
            result[channel] = "Accepted";
          } catch {
            result[channel] = "Failed";
          }
        }),
      );
      return result;
    },
  };
}
