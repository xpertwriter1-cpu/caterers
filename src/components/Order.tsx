import { useState } from "react";
import { currency, type PageData } from "../lib/types";

export default function Order(data: PageData) {
  const { currentUser } = data;
  const service = data.service!;
  const [quantity, setQuantity] = useState(1);

  return (
    <>
      <section className="section section-warm">
        <div className="container order-layout">
          <div className="order-photo">
            <img
              src={service.image || "/images/kenyan-food-spread.jpg"}
              alt={service.name}
            />
          </div>
          <div className="order-details">
            <p className="eyebrow">{service.category}</p>
            <h1>{service.name}</h1>
            <p>{service.description}</p>
            <div className="order-price">
              {service.quoteOnly || !service.price
                ? "Request a quote"
                : currency(service.price)}{" "}
              <small>
                {service.quoteOnly || !service.price
                  ? "Menu and price confirmed by the team"
                  : service.unit}
              </small>
            </div>
            <div className="notice">
              <strong>Before you order</strong>
              <p>
                Request food or catering online without creating an account. Our
                team confirms availability, the food price and delivery fee,
                then sends you a payment link. Payment is required before
                preparation and delivery.
              </p>
            </div>
            <form
              className="form-card compact-form"
              method="post"
              action={`/api/order/${service.id}`}
            >
              <label>
                Your name
                <input
                  name="requesterName"
                  required
                  maxLength={100}
                  autoComplete="name"
                  defaultValue={currentUser ? currentUser.name : ""}
                />
              </label>
              <label>
                Email for quotation and order updates
                <input
                  type="email"
                  name="requesterEmail"
                  required
                  maxLength={254}
                  autoComplete="email"
                  defaultValue={currentUser ? currentUser.email || "" : ""}
                />
              </label>
              <label>
                Delivery phone number
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={30}
                  autoComplete="tel"
                  placeholder="07xx xxx xxx"
                />
              </label>
              <label>
                Quantity / number of guests
                <input
                  id="quantity"
                  type="number"
                  name="quantity"
                  min="1"
                  max="5000"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  required
                />
              </label>
              <div className="total-row">
                <span>Price estimate</span>
                <strong id="estimated-total" data-price={service.price}>
                  {service.quoteOnly || !service.price
                    ? "To be confirmed"
                    : currency(service.price * quantity)}
                </strong>
              </div>
              <label>
                Delivery address / venue
                <input
                  name="deliveryAddress"
                  required
                  maxLength={500}
                  placeholder="Town, building, street or venue"
                />
              </label>
              <label>
                Preferred delivery date and time
                <input type="datetime-local" name="deliveryDate" />
              </label>
              <label>
                Payment preference
                <select name="paymentMethod">
                  <option value="M-PESA">M-PESA</option>
                  <option value="Card">Credit / debit card</option>
                </select>
              </label>
              <label>
                Notes
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={2000}
                  placeholder="Dietary needs or delivery instructions"
                ></textarea>
              </label>
              <button className="btn btn-dark btn-full" type="submit">
                Request food / catering ↗
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
