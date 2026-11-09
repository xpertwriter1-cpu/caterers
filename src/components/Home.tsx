import type { PageData } from "../lib/types";
import EventGallery from "./EventGallery";

const services = [
  {
    title: "Wedding and Ruracio Catering",
    image: "event-banquet.jpg",
    description:
      "Thoughtful menus for weddings, ruracio ceremonies, engagements and family celebrations.",
  },
  {
    title: "Corporate Catering",
    image: "professional-food-service.jpg",
    description:
      "Professional catering for meetings, conferences, seminars, workshops and office lunches.",
  },
  {
    title: "Traditional Kenyan Catering",
    image: "kenyan-food-spread.jpg",
    description:
      "Kenyan favourites including kienyeji chicken, nyama choma, mukimo, chapati and ugali.",
  },
  {
    title: "Private and Social Events",
    image: "elegant-event-tables.jpg",
    description:
      "Delicious food and dependable service for birthdays, graduations and special occasions.",
  },
  {
    title: "Outside Catering",
    image: "outdoor-event-catering.jpg",
    description:
      "We bring food preparation, delivery and service to your preferred venue.",
  },
  {
    title: "Institutional and Group Catering",
    image: "buffet-spread.jpg",
    description:
      "Flexible meal solutions for schools, organisations, churches and group functions.",
  },
];

const reasons = [
  ["Quality Food", "Carefully selected ingredients and delicious meals."],
  ["Generous Portions", "We believe in value for money and satisfying servings."],
  ["Customised Menus", "Menus designed around your preferences and budget."],
  ["Professional Team", "Dedicated catering personnel who understand hospitality."],
  ["Hygiene and Food Safety", "Careful food handling and preparation."],
  ["Reliable Service", "We value time and honour agreed arrangements."],
  ["Affordable Packages", "Catering solutions for different budgets."],
  ["Customer Satisfaction", "Your experience matters to us."],
];

const recentEvents = [
  ["2,000 guests", "Church event at St Antony of Padua, Kenyatta Road"],
  ["1,000 guests", "Kahugu Gardens, Juja"],
  ["500 guests", "Nakuru County"],
  ["100 guests", "Hardrock Estate, Kenyatta Road"],
];

const bookingSteps = [
  ["Contact us", "Reach us through phone, WhatsApp or our website."],
  [
    "Share your requirements",
    "Tell us about your event, date, location, number of guests and preferred menu.",
  ],
  [
    "Receive your quotation",
    "We will prepare a customised catering proposal based on your requirements and budget.",
  ],
  [
    "Confirm your booking",
    "Once you approve the quotation, we will guide you through the booking and payment arrangements.",
  ],
  [
    "Enjoy your event",
    "Our team takes care of the agreed catering arrangements so you can enjoy your special occasion.",
  ],
];

const faqs = [
  [
    "Do you offer outside catering?",
    "Yes. We provide outside catering services at clients’ preferred venues, subject to the event requirements and location.",
  ],
  [
    "Do you cater for small and large events?",
    "Yes. We cater for different event sizes, from intimate family gatherings to large functions.",
  ],
  [
    "Can I customise my menu?",
    "Absolutely. We work with clients to develop menus according to their preferences, event type and budget.",
  ],
  [
    "Do you offer corporate catering?",
    "Yes. We provide catering for meetings, conferences, workshops, seminars and corporate training.",
  ],
  [
    "How early should I book?",
    "We encourage clients to book as early as possible to allow adequate planning and preparation.",
  ],
  [
    "Do you provide catering equipment and serving staff?",
    "These can be discussed and included depending on your event requirements and quotation.",
  ],
  [
    "How do I get a quotation?",
    "Call or WhatsApp us, or complete the Request a Quote form on our website.",
  ],
];

export default function Home(_data: PageData) {
  return (
    <>
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <p className="eyebrow eyebrow-light">
            NANNY EVENTS AND CATERERS
          </p>
          <h1>
            Good Food.
            <br />
            Great Moments.
            <br />
            <em>Unforgettable Experiences.</em>
          </h1>
          <p className="hero-copy">
            We bring people together through delicious food, exceptional
            catering and professional event services. Quality meets quantity.
          </p>
          <div className="hero-actions">
            <a className="btn btn-gold" href="/book">
              Request a quote <span>↗</span>
            </a>
            <a className="btn btn-outline-light" href="/services">
              Explore our services
            </a>
          </div>
          <div className="hero-note">
            <span className="hero-dot"></span> Kenyatta Road, Kenya · Call or
            WhatsApp 0723 548 397
          </div>
        </div>
      </section>
      <section className="promise-strip" aria-label="Our promise">
        <div className="container promise-items">
          <div>
            <span className="promise-mark">01</span>
            <span>Quality ingredients</span>
          </div>
          <div>
            <span className="promise-mark">02</span>
            <span>Generous portions</span>
          </div>
          <div>
            <span className="promise-mark">03</span>
            <span>Professional service</span>
          </div>
          <div>
            <span className="promise-mark">04</span>
            <span>Made for your occasion</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-section">
          <div className="split-photo">
            <img
              src="/images/catering-team-buffet.jpg"
              alt="Catering team preparing a buffet"
              loading="lazy"
            />
          </div>
          <div className="split-copy">
            <p className="eyebrow">WELCOME TO NANNY EVENTS AND CATERERS</p>
            <h2>
              Exceptional catering.
              <br />
              <em>Memorable experiences.</em>
            </h2>
            <p>
              At Nanny Events and Caterers, we believe every occasion deserves
              great food and excellent service. We are a Kenyan catering
              company specialising in outside catering, corporate catering,
              weddings, ruracio ceremonies, private functions and traditional
              Kenyan cuisine.
            </p>
            <p>
              Whether you are organising an intimate family gathering, a
              corporate event or a grand celebration, we are committed to
              making your occasion special through delicious meals, generous
              portions and professional service.
            </p>
            <p>
              From menu planning to food preparation and service, we handle
              every detail with care. Our promise: Quality, Quantity and
              Customer Satisfaction.
            </p>
            <div className="hero-actions">
              <a className="btn btn-dark" href="/services">
                Explore our services
              </a>
              <a className="text-link" href="/book">
                Request a quote ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-warm">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OUR SERVICES</p>
              <h2>Good food for every gathering.</h2>
            </div>
            <a className="text-link" href="/services">
              Explore our menus ↗
            </a>
          </div>
          <div className="service-grid">
            {services.map((service, index) => (
              <article className="service-card" key={service.title}>
                <a className="service-image" href="/book">
                  <img
                    src={`/images/${service.image}`}
                    alt={service.title}
                    loading="lazy"
                  />
                  <span className="image-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </a>
                <div className="service-card-body">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <div className="card-bottom">
                    <strong>Custom quotation</strong>
                    <a href="/book">Enquire ↗</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="section protocol-section"
        aria-labelledby="protocol-heading"
      >
        <div className="container protocol-layout">
          <a
            className="protocol-poster"
            href="/images/nanny-protocol-events-team.jpeg"
            target="_blank"
            rel="noopener"
            aria-label="View the full Nanny Protocol and Events Team poster (opens in a new tab)"
          >
            <img
              src="/images/nanny-protocol-events-team.jpeg"
              alt="Nanny Protocol and Events Team services poster featuring the team, event setups and contact numbers 0702 952 266 and 0723 548 397"
              width={1024}
              height={1536}
              loading="lazy"
            />
            <span>Tap to view the full-size poster ↗</span>
          </a>
          <div className="split-copy">
            <p className="eyebrow">PROTOCOL &amp; EVENT SUPPORT</p>
            <h2 id="protocol-heading">
              Your event.
              <br />
              <em>Our priority.</em>
            </h2>
            <p>
              Give every guest a warm welcome. Our protocol and events team
              helps coordinate the details, from arrival and seating to
              catering and the flow of your day.
            </p>
            <ul className="check-list">
              <li>Guest reception and registration</li>
              <li>VIP and guest-of-honour protocol</li>
              <li>Seating arrangements and ushering</li>
              <li>Event coordination and time management</li>
              <li>Catering coordination</li>
              <li>Guest welfare and general support</li>
            </ul>
            <a className="btn btn-dark" href="/book">
              Enquire about our protocol team <span>↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container why-us">
          <div>
            <p className="eyebrow">WHY CHOOSE US?</p>
            <h2>Why choose Nanny Events and Caterers?</h2>
            <p>
              Choosing the right caterer makes all the difference. We
              understand that every event is important, and we go the extra
              mile to ensure our clients receive excellent food and dependable
              service.
            </p>
            <p>
              With Nanny Events and Caterers, you can focus on enjoying your
              occasion while we take care of the food.
            </p>
          </div>
          <ul className="check-list">
            {reasons.map(([title, description]) => (
              <li key={title}>
                <strong>{title}:</strong> {description}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <EventGallery />

      <section className="section section-warm">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">HOW TO BOOK OUR SERVICES</p>
              <h2>How it works.</h2>
              <p className="gallery-intro">
                Booking Nanny Events and Caterers is simple. Let us make your
                next event delicious and memorable!
              </p>
            </div>
            <a className="text-link" href="/book">
              Start planning ↗
            </a>
          </div>
          <ol className="booking-steps">
            {bookingSteps.map(([title, description], index) => (
              <li className="booking-step" key={title}>
                <span className="step-number">0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section testimonials">
        <div className="container testimonial-card">
          <p className="eyebrow">CLIENT TESTIMONIALS</p>
          <h2>Your experience matters to us.</h2>
          <p>
            We’re gathering feedback from our clients. Have we catered your
            event? We’d love to hear about your experience.
          </p>
          <h3>Some of the events we’ve catered</h3>
          <ul className="check-list">
            {recentEvents.map(([guests, event]) => (
              <li key={event}>
                <strong>{guests}:</strong> {event}
              </li>
            ))}
          </ul>
          <a className="btn btn-dark" href="/contact">
            Share your experience
          </a>
        </div>
      </section>

      <section className="section section-warm">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p>
              <h2>Helpful details before you book.</h2>
            </div>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details className="faq-item" key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <p className="eyebrow eyebrow-light">LET’S MAKE YOUR EVENT SPECIAL</p>
            <h2>Planning an event?</h2>
            <p>
              We would love to be part of your special occasion. Contact us
              today and let us take care of the food!
            </p>
          </div>
          <a className="btn btn-gold" href="/book">
            Request a quotation ↗
          </a>
        </div>
      </section>
    </>
  );
}
