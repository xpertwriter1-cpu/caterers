import type {
  AdminNotifications as Status,
  NotificationKind,
} from "../lib/types";

export function AdminNotifications({
  record,
  kind,
}: {
  record: {
    _id: string;
    adminNotifications?: {
      email?: string | null;
      whatsapp?: string | null;
      attemptedAt?: string | Date | null;
    } | null;
  };
  kind: NotificationKind;
}) {
  const status = record.adminNotifications;
  return (
    <div className="record-notes">
      <p>
        Admin alerts: Email — {status?.email || "Not attempted"} · WhatsApp —{" "}
        {status?.whatsapp || "Not attempted"}.
      </p>
      {status?.attemptedAt && (
        <p>
          Last attempt:{" "}
          {new Date(status.attemptedAt).toLocaleString("en-KE", {
            timeZone: "Africa/Nairobi",
          })}
        </p>
      )}
      {(status?.email !== "Accepted" || status?.whatsapp !== "Accepted") && (
        <form
          method="post"
          action={`/api/admin/notifications/${kind}/${record._id}/retry`}
        >
          <button className="small-btn" type="submit">
            Retry admin alerts
          </button>
        </form>
      )}
    </div>
  );
}
