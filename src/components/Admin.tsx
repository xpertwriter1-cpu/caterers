import { Fragment } from "react";
import { currency, type PageData } from "../lib/types";
import { AdminNotifications } from "./AdminNotifications";

export default function Admin(data: PageData) {
  const {
    services,
    bookings,
    orders,
    inquiries,
    customers,
    stats,
    emailConfigured,
    adminNotificationConfig,
    bookingStatuses,
    message,
  } = data;

  const contactInquiries = typeof inquiries === "undefined" ? [] : inquiries;
  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">BUSINESS CONTROL CENTRE</p>
          <h1>
            Admin <em>dashboard.</em>
          </h1>
          <p>
            Review customer requests, manage service listings and update order
            progress.
          </p>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container">
          <div className="notice">
            <strong>Admin notifications</strong>
            <p>
              New contact enquiries, food orders and event quotation requests
              trigger email and WhatsApp alerts. Accepted means the provider
              accepted the message; delivery is not confirmed.
            </p>
            {typeof adminNotificationConfig !== "undefined" ? (
              <>
                <p>
                  Email:{" "}
                  {adminNotificationConfig.email
                    ? "Configured"
                    : "Setup required"}{" "}
                  ? WhatsApp:{" "}
                  {adminNotificationConfig.whatsapp
                    ? "Configured"
                    : "Setup required"}
                  .
                </p>
              </>
            ) : null}
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total bookings</span>
              <strong>{stats.bookingCount}</strong>
            </div>
            <div className="stat-card">
              <span>Total orders</span>
              <strong>{stats.orderCount}</strong>
            </div>
            <div className="stat-card">
              <span>Customers</span>
              <strong>{customers}</strong>
            </div>
            <div className="stat-card">
              <span>Marked paid</span>
              <strong>{currency(stats.paidTotal)}</strong>
            </div>
          </div>
          <div className="dashboard-heading top-gap">
            <div><p className="eyebrow">ACCESS</p><h2>Manage user roles</h2></div>
          </div>
          <p>The configured admin emails have owner access. You can grant other verified users admin access here.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Email</th><th>Verification</th><th>Role</th><th>Action</th></tr></thead>
              <tbody>{data.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td><td>{user.email}</td><td>{user.verified ? "Verified" : "Pending"}</td><td>{user.role}</td>
                  <td>{user.primaryAdmin ? "Configured owner" : user.id === data.currentUser?.id ? "Your account" : (
                    <form method="post" action={`/api/admin/users/${user.id}/role`}>
                      <select name="role" defaultValue={user.role} aria-label={`Role for ${user.email}`}>
                        <option value="customer">Customer</option>
                        <option value="admin" disabled={!user.verified}>Admin</option>
                      </select>{" "}
                      <button className="small-btn" type="submit">Save role</button>
                    </form>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="dashboard-heading top-gap">
            <div>
              <p className="eyebrow">CATALOGUE</p>
              <h2>Manage services</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, __index) => (
                  <Fragment key={__index}>
                    <tr>
                      <td>
                        <strong>{s.name}</strong>
                        <small>{s.unit}</small>
                      </td>
                      <td>{s.category}</td>
                      <td>{currency(s.price)}</td>
                      <td>
                        <span className="status">
                          {s.active ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td>
                        <form
                          method="post"
                          action={`/api/admin/services/${s.id}/toggle`}
                        >
                          <button className="small-btn" type="submit">
                            {s.active ? "Hide" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <details className="admin-add">
            <summary>+ Add a service or menu item</summary>
            <form
              className="form-card admin-form"
              method="post"
              action="/api/admin/services"
            >
              <div className="form-two">
                <label>
                  Service name
                  <input name="name" required maxLength={150} />
                </label>
                <label>
                  Category
                  <select name="category" required>
                    <option>Food</option>
                    <option>Event Catering</option>
                    <option>Hospitality</option>
                    <option>Equipment Hire</option>
                  </select>
                </label>
              </div>
              <label>
                Description
                <textarea
                  name="description"
                  rows={2}
                  required
                  maxLength={1000}
                ></textarea>
              </label>
              <div className="form-two">
                <label>
                  Price (KES)
                  <input name="price" type="number" min="0" step="1" required />
                </label>
                <label>
                  Price unit
                  <input name="unit" maxLength={60} placeholder="per guest" />
                </label>
              </div>
              <label>
                Image URL (optional)
                <input name="image" type="url" placeholder="https://..." />
              </label>
              <button className="btn btn-dark" type="submit">
                Add service
              </button>
            </form>
          </details>
          <div className="dashboard-heading top-gap">
            <div>
              <p className="eyebrow">CUSTOMER REQUESTS</p>
              <h2>Event bookings</h2>
            </div>
          </div>
          {!bookings.length ? (
            <>
              <div className="empty-state">
                No bookings have been submitted yet.
              </div>
            </>
          ) : null}
          <div className="admin-records">
            {bookings.map((b, __index) => (
              <Fragment key={__index}>
                <article className="record-card">
                  <div className="record-top">
                    <div>
                      <span className="status">{b.status}</span>
                      <h3>
                        {b.type} · {b.guestCount} guests
                      </h3>
                      <p>
                        {b.requesterName ||
                          (b.customer ? b.customer.name : "Customer")}{" "}
                        ·{" "}
                        {b.requesterEmail ||
                          (b.customer ? b.customer.email : "")}
                      </p>
                    </div>
                    <div className="record-date">
                      {new Date(b.eventDate).toLocaleDateString("en-KE", {
                        timeZone: "Africa/Nairobi",
                      })}
                      <small>{b.venue}</small>
                    </div>
                  </div>
                  <AdminNotifications record={b} kind="booking" />
                  <p className="record-notes">
                    Approver notification:{" "}
                    {b.approverNotificationStatus || "Not sent"}.{" "}
                    {b.approverNotificationStatus === "Failed" ? (
                      <>
                        Notification email failed; this booking is saved here
                        for review.
                      </>
                    ) : null}
                  </p>
                  {b.menuNeeds ? (
                    <>
                      <p className="record-notes">
                        <strong>Needs:</strong> {b.menuNeeds}
                      </p>
                    </>
                  ) : null}
                  <form
                    className="admin-inline-form"
                    method="post"
                    action={`/api/admin/bookings/${b.id}`}
                  >
                    <label>
                      Status
                      <select name="status" defaultValue={b.status}>
                        {bookingStatuses.map((st, __index) => (
                          <Fragment key={__index}>
                            <option>{st}</option>
                          </Fragment>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quote (KES)
                      <input
                        type="number"
                        name="quoteAmount"
                        min="0"
                        step="1"
                        defaultValue={
                          b.quoteAmount == null ? "" : b.quoteAmount
                        }
                        placeholder="Amount"
                      />
                    </label>
                    <label>
                      Proposed new date
                      <input
                        type="date"
                        name="proposedDate"
                        defaultValue={
                          b.proposedDate
                            ? new Date(b.proposedDate)
                                .toISOString()
                                .slice(0, 10)
                            : ""
                        }
                      />
                    </label>
                    <label className="notes-label">
                      Approver comments (visible to requester)
                      <textarea
                        name="approverComment"
                        rows={3}
                        maxLength={3000}
                        placeholder="Approval details or reason for rescheduling"
                        defaultValue={b.approverComment || ""}
                      />
                    </label>
                    <label className="notes-label">
                      Internal admin notes
                      <input
                        name="adminNotes"
                        defaultValue={b.adminNotes || ""}
                        maxLength={3000}
                        placeholder="Internal notes"
                      />
                    </label>
                    <div className="booking-email-actions">
                      <p>
                        Send to:{" "}
                        <strong>
                          {b.requesterEmail ||
                            (b.customer && b.customer.email) ||
                            "No email available"}
                        </strong>
                      </p>
                      <p>
                        Latest update email: {b.emailStatus || "Not sent"}
                        {b.emailedAt ? (
                          <>
                            {" "}
                            on{" "}
                            {new Date(b.emailedAt).toLocaleString("en-KE", {
                              timeZone: "Africa/Nairobi",
                            })}
                          </>
                        ) : null}
                      </p>
                      {!emailConfigured ? (
                        <>
                          <p>
                            Email sending is not configured. Add SMTP settings
                            to enable it.
                          </p>
                        </>
                      ) : null}
                      <button className="small-btn" type="submit">
                        Save without emailing
                      </button>{" "}
                      <button
                        className="small-btn"
                        type="submit"
                        name="sendEmail"
                        value="on"
                        disabled={!emailConfigured}
                      >
                        Save and email requester
                      </button>
                    </div>
                  </form>
                </article>
              </Fragment>
            ))}
          </div>
          <div className="dashboard-heading top-gap">
            <div>
              <p className="eyebrow">FULFILMENT</p>
              <h2>Food orders</h2>
            </div>
          </div>
          {!orders.length ? (
            <>
              <div className="empty-state">
                No food orders have been submitted yet.
              </div>
            </>
          ) : null}
          <div className="admin-records">
            {orders.map((o, __index) => (
              <Fragment key={__index}>
                <article className="record-card">
                  <div className="record-top">
                    <div>
                      <span className="status">{o.status}</span>
                      <h3>
                        Order #{o.id.toString().slice(-6).toUpperCase()} ·{" "}
                        {currency(o.total)}
                      </h3>
                      <p>
                        {o.requesterName ||
                          (o.customer ? o.customer.name : "Customer")}{" "}
                        ·{" "}
                        {o.requesterEmail ||
                          (o.customer ? o.customer.email : "")}
                      </p>
                      <p>Phone: {o.phone || "Not provided"}</p>
                      <p>
                        {o.items
                          .map((i) => `${i.name} × ${i.quantity}`)
                          .join(", ")}
                      </p>
                    </div>
                    <div className="record-date">
                      {o.paymentMethod}
                      <small>{o.deliveryAddress}</small>
                    </div>
                  </div>
                  <AdminNotifications record={o} kind="order" />
                  <form
                    className="admin-inline-form"
                    method="post"
                    action={`/api/admin/orders/${o.id}`}
                  >
                    <label>
                      Order status
                      <select name="status" defaultValue={o.status}>
                        {[
                          "Received",
                          "Confirmed",
                          "Preparing",
                          "Ready for dispatch",
                          "Out for delivery",
                          "Delivered",
                          "Cancelled",
                        ].map((st, __index) => (
                          <Fragment key={__index}>
                            <option>{st}</option>
                          </Fragment>
                        ))}
                      </select>
                    </label>
                    <label>
                      Food / services quote (KES)
                      <input
                        type="number"
                        name="foodTotal"
                        min="1"
                        step="0.01"
                        defaultValue={
                          o.quoted
                            ? (o.total - (o.deliveryFee || 0)).toFixed(2)
                            : ""
                        }
                        readOnly={Boolean(
                          o.paymentReference || o.paymentStatus === "Paid",
                        )}
                      />
                    </label>
                    <label>
                      Delivery fee (KES)
                      <input
                        type="number"
                        name="deliveryFee"
                        min="0"
                        step="0.01"
                        defaultValue={o.deliveryFee || 0}
                        readOnly={Boolean(
                          o.paymentReference || o.paymentStatus === "Paid",
                        )}
                      />
                    </label>
                    <label>
                      Driver / delivery contact
                      <input
                        name="deliveryContact"
                        maxLength={200}
                        defaultValue={o.deliveryContact || ""}
                      />
                    </label>
                    <label>
                      Delivery update
                      <input
                        name="deliveryNotes"
                        maxLength={1000}
                        defaultValue={o.deliveryNotes || ""}
                      />
                    </label>
                    <div className="booking-email-actions">
                      <p>
                        Payment: <strong>{o.paymentStatus}</strong> &middot;
                        Total: {currency(o.total)}. Payment must be verified
                        before preparation and dispatch.
                      </p>
                      {o.accessToken ? (
                        <>
                          <a
                            className="text-link"
                            href={`/requests/${o.accessToken}`}
                            target="_blank"
                            rel="noopener"
                          >
                            View private order page
                          </a>
                        </>
                      ) : null}
                      <p>Quotes are locked when checkout begins.</p>
                      <button className="small-btn" type="submit">
                        Save
                      </button>{" "}
                      <button
                        className="small-btn"
                        type="submit"
                        name="emailOrder"
                        value="on"
                      >
                        Save and email quotation / update
                      </button>
                    </div>
                  </form>
                </article>
              </Fragment>
            ))}
          </div>
          <div className="dashboard-heading top-gap">
            <div>
              <p className="eyebrow">CONTACT REQUESTS</p>
              <h2>Client enquiries</h2>
            </div>
          </div>

          {!contactInquiries.length ? (
            <>
              <div className="empty-state">
                No contact enquiries have been submitted yet.
              </div>
            </>
          ) : null}
          <div className="admin-records">
            {contactInquiries.map((inquiry, __index) => (
              <Fragment key={__index}>
                <article className="record-card">
                  <div className="record-top">
                    <div>
                      <h3>{inquiry.subject || "General enquiry"}</h3>
                      <p>
                        {inquiry.requesterName} &middot;{" "}
                        {inquiry.requesterEmail}
                      </p>
                    </div>
                    <div className="record-date">
                      {new Date(inquiry.createdAt).toLocaleString("en-KE", {
                        timeZone: "Africa/Nairobi",
                      })}
                    </div>
                  </div>
                  <p
                    className="record-notes"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {inquiry.message}
                  </p>
                  <AdminNotifications record={inquiry} kind="inquiry" />
                  <a
                    className="text-link"
                    href={`mailto:${inquiry.requesterEmail}`}
                  >
                    Reply by email
                  </a>
                </article>
              </Fragment>
            ))}
          </div>
          <div className="notice top-gap">
            <strong>Payment safety</strong>
            <p>
              Orders are marked paid only after server verification with
              Paystack. Configure and test your merchant account before
              accepting live payments. Preparation and dispatch require verified
              payment.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
