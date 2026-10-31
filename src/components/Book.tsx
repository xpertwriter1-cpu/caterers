import { type PageData } from "../lib/types";

export default function Book(data: PageData) {
  const { currentUser } = data;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">EVENTS & CATERING</p>
          <h1>
            Tell us what you're
            <br />
            <em>bringing people together for.</em>
          </h1>
          <p>
            Share your event date, venue, guest count and menu preferences. Our
            team will review the request and contact you to discuss availability
            and a quotation.
          </p>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container booking-layout">
          <div className="booking-intro">
            <p className="eyebrow">LET'S PLAN</p>
            <h2>Made for your occasion.</h2>
            <p>
              From corporate catering to weddings, ruracio and dowry ceremonies,
              tell us what you have in mind.
            </p>
            <ul className="check-list">
              <li>Choose your event date and guest count</li>
              <li>Tell us the venue and preferred Kenyan dishes</li>
              <li>Share a target budget if you have one</li>
              <li>Receive booking decisions and comments by email</li>
            </ul>
            <div className="notice">
              <strong>Good to know</strong>
              <p>
                This form submits a request, not a confirmed reservation. No
                price is assumed; a quotation is confirmed by the team. The team
                must confirm availability, final price and payment terms.
              </p>
            </div>
          </div>
          <form
            className="form-card booking-form"
            action="/api/book"
            method="post"
          >
            <h2>Event request</h2>
            <label>
              Your name
              <input
                name="requesterName"
                required
                maxLength={100}
                autoComplete="name"
                defaultValue={currentUser ? currentUser.name : ""}
                placeholder="Your full name"
              />
            </label>
            <label>
              Requester email (Gmail or another provider)
              <input
                type="email"
                name="requesterEmail"
                required
                maxLength={254}
                autoComplete="email"
                defaultValue={currentUser ? currentUser.email || "" : ""}
                placeholder="you@gmail.com"
              />
              <span className="form-note">
                We will send booking decisions, comments and rescheduling
                requests here.
              </span>
            </label>
            <div className="form-two">
              <label>
                Event type
                <select name="type" required>
                  <option value="">Select event</option>
                  <option>Wedding</option>
                  <option>Ruracio / dowry ceremony</option>
                  <option>Traditional family celebration</option>
                  <option>Birthday or anniversary</option>
                  <option>Graduation</option>
                  <option>Corporate meeting</option>
                  <option>Conference or workshop</option>
                  <option>Private party</option>
                  <option>Daily meal delivery</option>
                  <option>Other hospitality request</option>
                </select>
              </label>
              <label>
                Event date
                <input
                  type="date"
                  name="eventDate"
                  min={new Date().toLocaleDateString("en-CA", {
                    timeZone: "Africa/Nairobi",
                  })}
                  required
                />
              </label>
            </div>
            <div className="form-two">
              <label>
                Estimated guests
                <input
                  type="number"
                  name="guestCount"
                  min="1"
                  max="100000"
                  required
                  placeholder="e.g. 80"
                />
              </label>
              <label>
                Budget in KES <span className="optional">(optional)</span>
                <input
                  type="number"
                  name="budget"
                  min="0"
                  step="100"
                  placeholder="e.g. 100000"
                />
              </label>
            </div>
            <label>
              Venue / delivery location
              <input
                name="venue"
                required
                maxLength={300}
                placeholder="Venue, town or full delivery address"
              />
            </label>
            <label>
              Menu and service requirements
              <textarea
                name="menuNeeds"
                rows={4}
                maxLength={3000}
                placeholder="Meal preferences, dietary needs, equipment, staff..."
              ></textarea>
            </label>
            <label>
              Additional notes
              <textarea
                name="notes"
                rows={3}
                maxLength={3000}
                placeholder="Anything else we should know?"
              ></textarea>
            </label>
            <button className="btn btn-dark btn-full" type="submit">
              Submit event request ↗
            </button>
            <p className="form-note">
              No account needed. Our team will reply to the email address you
              provide.
            </p>
          </form>
        </div>
      </section>
      <div className="container whatsapp-booking">
        <p>
          Prefer WhatsApp?{" "}
          <a
            href="https://wa.me/254723548397?text=Hello%20Nanny%20Events%20%26%20Caterers%2C%20I%27d%20like%20to%20request%20an%20event%20quotation."
            target="_blank"
            rel="noopener"
          >
            Send your event enquiry directly ↗
          </a>
        </p>
      </div>
    </>
  );
}
