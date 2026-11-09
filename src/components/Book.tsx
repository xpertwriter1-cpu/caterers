import { type PageData } from "../lib/types";

export default function Book(data: PageData) {
  const { currentUser } = data;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">REQUEST A CATERING QUOTATION</p>
          <h1>
            Let’s make your event
            <br />
            <em>special.</em>
          </h1>
          <p>
            Planning an event? We would love to be part of your special
            occasion. Share a few details with us, and our team will get in
            touch to discuss your catering requirements and prepare a
            customised quotation.
          </p>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container booking-layout">
          <div className="booking-intro">
            <p className="eyebrow">LET'S PLAN</p>
            <h2>Made for your occasion.</h2>
            <p>
              Our promise: We will work with your needs and budget to recommend
              a suitable catering package.
            </p>
            <ul className="check-list">
              <li>Choose your event date and guest count</li>
              <li>Tell us the venue and preferred Kenyan dishes</li>
              <li>Share your budget per person or total budget</li>
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
              Full name
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
              Phone number
              <input
                type="tel"
                name="phone"
                required
                maxLength={30}
                autoComplete="tel"
                placeholder="e.g. 0723 548 397"
              />
            </label>
            <label>
              Email address
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
                Type of event
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
                Estimated number of guests
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
                <span className="form-note">
                  Per person or total budget. Tell us which under additional
                  requirements.
                </span>
              </label>
            </div>
            <label>
              Event location
              <input
                name="venue"
                required
                maxLength={300}
                placeholder="Venue, town or full delivery address"
              />
            </label>
            <label>
              Preferred menu or type of food
              <textarea
                name="menuNeeds"
                rows={4}
                maxLength={3000}
                placeholder="Meal preferences, dietary needs, equipment, staff..."
              ></textarea>
            </label>
            <label>
              Additional requirements
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
              No account needed. Our team will contact you using the details
              provided. Submitting this form is a request, not a confirmed
              booking.
            </p>
          </form>
        </div>
      </section>
      <div className="container whatsapp-booking">
        <p>
          Contact us today and let us take care of the food! Prefer WhatsApp?{" "}
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
