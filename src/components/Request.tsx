import { Fragment } from "react";
import { currency, type PageData } from "../lib/types";

export default function Request(data: PageData) {
  const { services, paymentsConfigured } = data;
  const order = data.order!;

  return (
    <>
      <section className="section section-warm">
        <div className="container booking-layout">
          <div className="booking-intro">
            <p className="eyebrow">YOUR FOOD &amp; CATERING REQUEST</p>
            <h1>Order #{order.id.toString().slice(-6).toUpperCase()}</h1>
            <p>
              Keep this private link to check your quotation, payment and
              delivery. No account needed.
            </p>
            <span className="status">{order.status}</span>
            <ul className="check-list">
              {order.items.map((item, __index) => (
                <Fragment key={__index}>
                  <li>
                    {item.name} &times; {item.quantity}
                  </li>
                </Fragment>
              ))}
            </ul>
          </div>
          <div className="form-card">
            <h2>Payment &amp; delivery</h2>
            <p>
              <strong>Customer:</strong> {order.requesterName}
            </p>
            <p>
              <strong>Email:</strong> {order.requesterEmail}
            </p>
            <p>
              <strong>Delivery:</strong> {order.deliveryAddress}
            </p>
            <p>
              <strong>Requested time:</strong>{" "}
              {order.deliveryDate
                ? new Date(order.deliveryDate).toLocaleString("en-KE", {
                    timeZone: "Africa/Nairobi",
                  })
                : "To be agreed"}
            </p>
            <p>
              <strong>Delivery contact:</strong>{" "}
              {order.deliveryContact || "To be assigned"}
            </p>
            {order.deliveryNotes ? (
              <>
                <p>{order.deliveryNotes}</p>
              </>
            ) : null}
            {order.quoted ? (
              <>
                <div className="total-row">
                  <span>Food / services</span>
                  <strong>{currency(order.total - order.deliveryFee)}</strong>
                </div>
                <div className="total-row">
                  <span>Delivery fee</span>
                  <strong>{currency(order.deliveryFee)}</strong>
                </div>
                <div className="total-row">
                  <span>Total to pay</span>
                  <strong>{currency(order.total)}</strong>
                </div>
              </>
            ) : (
              <>
                <p>
                  Our team will confirm availability and send the final
                  quotation, including delivery, to your email.
                </p>
              </>
            )}
            <p>
              <strong>Payment:</strong> {order.paymentStatus} &middot;{" "}
              {order.paymentMethod}
            </p>
            {order.quoted &&
            order.paymentStatus !== "Paid" &&
            order.status !== "Cancelled" ? (
              <>
                {paymentsConfigured ? (
                  <>
                    <form
                      action={`/api/requests/${order.accessToken}/pay`}
                      method="post"
                    >
                      <button className="btn btn-dark btn-full">
                        Pay securely with{" "}
                        {order.paymentMethod === "Card"
                          ? "credit / debit card"
                          : "M-PESA"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="notice">
                      <strong>Online payment is awaiting setup</strong>
                      <p>
                        Please contact our team. Your order is saved and will
                        remain pending payment.
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : null}
            {order.paymentReference && order.paymentStatus !== "Paid" ? (
              <>
                <p>
                  <a
                    className="text-link"
                    href={`/requests/${order.accessToken}/verify`}
                  >
                    Already paid? Check payment status
                  </a>
                </p>
              </>
            ) : null}
            <p className="form-note">
              Payment is required before preparation and dispatch. Card details
              and M-PESA authorisation are handled by the payment provider.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
