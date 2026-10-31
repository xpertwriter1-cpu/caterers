import { Fragment } from "react";
import { currency, type PageData } from "../lib/types";

export default function Account(data: PageData) {
  const { currentUser, services, bookings, orders } = data;

  return (
    <>
      <section className="page-hero compact-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">YOUR NANNY ACCOUNT</p>
          <h1>
            Welcome, <em>{currentUser!.name.split(" ")[0]}.</em>
          </h1>
          <p>Review your event requests and food orders in one place.</p>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container">
          <div className="account-actions">
            <a className="btn btn-dark" href="/book">
              + Request event catering
            </a>
            <a className="btn btn-outline-dark" href="/services">
              Browse food & services
            </a>
          </div>
          <div className="dashboard-heading">
            <div>
              <p className="eyebrow">EVENTS</p>
              <h2>Your bookings</h2>
            </div>
            <span className="count-pill">{bookings.length} requests</span>
          </div>
          {!bookings.length ? (
            <>
              <div className="empty-state">
                <h3>No event requests yet</h3>
                <p>Tell us about your next event to get started.</p>
                <a className="text-link" href="/book">
                  Plan an event ↗
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Date</th>
                      <th>Guests</th>
                      <th>Status</th>
                      <th>Quote</th>
                      <th>Approver comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b, __index) => (
                      <Fragment key={__index}>
                        <tr>
                          <td>
                            <strong>{b.type}</strong>
                            <small>{b.venue}</small>
                          </td>
                          <td>
                            {new Date(b.eventDate).toLocaleDateString("en-KE", {
                              timeZone: "Africa/Nairobi",
                            })}
                          </td>
                          <td>{b.guestCount}</td>
                          <td>
                            <span className="status">{b.status}</span>
                          </td>
                          <td>
                            {b.quoteAmount != null
                              ? currency(b.quoteAmount)
                              : "Pending"}
                          </td>
                          <td className="booking-feedback">
                            <p>
                              {b.approverComment ||
                                "Awaiting review from our team."}
                            </p>
                            {b.proposedDate ? (
                              <>
                                <small>
                                  <strong>
                                    Proposed date:{" "}
                                    {new Date(
                                      b.proposedDate,
                                    ).toLocaleDateString("en-KE", {
                                      timeZone: "Africa/Nairobi",
                                    })}
                                  </strong>
                                  Please contact us to confirm whether this date
                                  works for you.
                                </small>
                              </>
                            ) : null}
                            {b.reviewedAt ? (
                              <>
                                <small>
                                  Reviewed{" "}
                                  {new Date(b.reviewedAt).toLocaleString(
                                    "en-KE",
                                    { timeZone: "Africa/Nairobi" },
                                  )}
                                </small>
                              </>
                            ) : null}
                            {b.requesterEmail ? (
                              <>
                                <small>Updates to: {b.requesterEmail}</small>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="dashboard-heading top-gap">
            <div>
              <p className="eyebrow">FOOD & DELIVERY</p>
              <h2>Your orders</h2>
            </div>
            <span className="count-pill">{orders.length} orders</span>
          </div>
          {!orders.length ? (
            <>
              <div className="empty-state">
                <h3>No food orders yet</h3>
                <p>
                  Explore our menu for office lunches, snacks and event
                  platters.
                </p>
                <a className="text-link" href="/services">
                  Browse the menu ↗
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Delivery</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, __index) => (
                      <Fragment key={__index}>
                        <tr>
                          <td>
                            <strong>
                              #{o._id.toString().slice(-6).toUpperCase()}
                            </strong>
                            <small>
                              {o.items
                                .map((i) => `${i.name} × ${i.quantity}`)
                                .join(", ")}
                            </small>
                          </td>
                          <td>
                            {o.deliveryDate
                              ? new Date(o.deliveryDate).toLocaleString(
                                  "en-KE",
                                  { timeZone: "Africa/Nairobi" },
                                )
                              : "To be confirmed"}
                            <small>{o.deliveryAddress}</small>
                          </td>
                          <td>{currency(o.total)}</td>
                          <td>
                            {o.paymentMethod}
                            <small>{o.paymentStatus}</small>
                          </td>
                          <td>
                            <span className="status">{o.status}</span>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
