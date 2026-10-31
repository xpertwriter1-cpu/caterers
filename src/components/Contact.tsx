import { type PageData } from "../lib/types";

export default function Contact() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">GET IN TOUCH</p>
          <h1>
            Let's talk about
            <br />
            <em>what you're planning.</em>
          </h1>
          <p>Tell us about your occasion, order or hospitality request.</p>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container contact-layout">
          <div className="contact-copy">
            <p className="eyebrow">WE'RE HERE TO HELP</p>
            <h2>Every good event starts with a conversation.</h2>
            <p>
              Send us a message and include any details that will help us
              understand your request.
            </p>
            <div className="contact-detail">
              <span>✉</span>
              <div>
                <strong>Email</strong>
                <p>Please contact us by phone or WhatsApp.</p>
              </div>
            </div>
            <div className="contact-detail">
              <span>☎</span>
              <div>
                <strong>Phone / WhatsApp</strong>
                <p>
                  <a href="tel:+254723548397">0723 548 397</a> /{" "}
                  <a href="tel:+254733548397">0733 548 397</a>
                </p>
                <p>
                  <a
                    href="https://wa.me/254723548397?text=Hello%20Nanny%20Events%20%26%20Caterers%2C%20I%27d%20like%20to%20make%20an%20enquiry."
                    target="_blank"
                    rel="noopener"
                  >
                    Start a WhatsApp chat ↗
                  </a>
                </p>
              </div>
            </div>
            <div className="contact-detail">
              <span>⌖</span>
              <div>
                <strong>Service area</strong>
                <p>
                  Nairobi and surrounding areas; ask us about your venue or
                  delivery location.
                </p>
              </div>
            </div>
          </div>
          <form className="form-card" action="/api/contact" method="post">
            <h2>Send an enquiry</h2>
            <label>
              Your name
              <input name="name" required maxLength={100} autoComplete="name" />
            </label>
            <label>
              Email address
              <input
                type="email"
                name="email"
                required
                maxLength={200}
                autoComplete="email"
              />
            </label>
            <label>
              Subject
              <input
                name="subject"
                maxLength={150}
                placeholder="Event catering, food delivery..."
              />
            </label>
            <label>
              How can we help?
              <textarea
                name="message"
                required
                rows={5}
                maxLength={3000}
              ></textarea>
            </label>
            <button className="btn btn-dark btn-full" type="submit">
              Send enquiry ↗
            </button>
            <p className="form-note">
              Your enquiry is sent to our team for review. For a faster reply,
              use WhatsApp.
            </p>
          </form>
        </div>
      </section>
      <div className="container social-links">
        <a
          className="btn btn-dark"
          href="https://www.facebook.com/NannyCaterersServices/"
          target="_blank"
          rel="noopener"
        >
          Facebook page ↗
        </a>{" "}
        <a
          className="btn btn-dark"
          href="https://www.instagram.com/nannycaterers/"
          target="_blank"
          rel="noopener"
        >
          Instagram ↗
        </a>
      </div>
    </>
  );
}
