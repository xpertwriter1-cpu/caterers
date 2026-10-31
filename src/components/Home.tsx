import { Fragment } from "react";
import { currency, type PageData } from "../lib/types";
import EventGallery from "./EventGallery";

export default function Home(data: PageData) {
  const { services } = data;

  const galleryPhotos = [
    ["buffet-team.jpg", "Nanny catering team serving a buffet"],
    ["elegant-event-tables.jpg", "Elegant event dining setup"],
    ["kienyeji-chicken.jpg", "Kienyeji chicken prepared for an event"],
    ["pilau-rice.jpg", "Pilau rice for a Kenyan menu"],
    ["kenyan-food-spread.jpg", "Traditional Kenyan food spread"],
    ["event-banquet.jpg", "Event venue prepared for guests"],
    ["catering-team-buffet.jpg", "Catering team and buffet service"],
    ["fresh-vegetables.jpg", "Fresh vegetable accompaniments"],
    ["spiced-rice.jpg", "Spiced rice prepared for catering"],
    ["fresh-tomato-salad.jpg", "Fresh tomato salad"],
    ["outdoor-event-catering.jpg", "Outdoor event catering setup"],
    ["refreshments.jpg", "Refreshments for guests"],
    ["roast-potatoes.jpg", "Potato side dish"],
    ["professional-food-service.jpg", "Professional food service"],
    ["nanny-event-team.jpg", "Nanny team at an event"],
    ["catering-service-team.jpg", "Catering service team"],
    ["event-buffet-service.jpg", "Buffet service at an event"],
    ["buffet-spread.jpg", "Catering buffet spread"],
    ["kenyan-bean-salad.jpg", "Kenyan-style salad"],
    ["refreshment-service.jpg", "Refreshment service"],
    ["chef-preparing-food.jpg", "Chef preparing food"],
    ["nanny-catering-team.jpg", "Nanny team with catered dishes"],
    ["catering-team.jpg", "Event catering team"],
    ["buffet-food.jpg", "Prepared buffet dishes"],
    ["green-soup.jpg", "Traditional green soup"],
  ];
  return (
    <>
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <p className="eyebrow eyebrow-light">
            NAIROBI CATERING · KENYAN FLAVOURS · EVENT CARE
          </p>
          <h1>
            Your occasion,
            <br />
            <em>beautifully served.</em>
          </h1>
          <p className="hero-copy">
            From weddings and dowry ceremonies to corporate functions and family
            celebrations, Nanny Events & Caterers brings traditional Kenyan food
            and thoughtful event coordination to your occasion.
          </p>
          <div className="hero-actions">
            <a className="btn btn-gold" href="/book">
              Plan your event <span>↗</span>
            </a>
            <a className="btn btn-outline-light" href="/services">
              Explore our services
            </a>
          </div>
          <div className="hero-note">
            <span className="hero-dot"></span> Serving Nairobi and surrounding
            areas · Enquire for availability
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <div className="container trust-items">
          <span>WEDDINGS & DOWRY CEREMONIES</span>
          <span>•</span>
          <span>CORPORATE CATERING</span>
          <span>•</span>
          <span>TRADITIONAL KENYAN MENUS</span>
          <span>•</span>
          <span>HOSPITALITY SERVICES</span>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WHAT WE DO</p>
              <h2>Kenyan favourites, made for sharing.</h2>
            </div>
            <a className="text-link" href="/services">
              View all services ↗
            </a>
          </div>
          <div className="service-grid">
            {services.map((service, index) => (
              <Fragment key={index}>
                <article className="service-card">
                  <a className="service-image" href="/services">
                    <img
                      src={service.image || "/images/kenyan-food-spread.jpg"}
                      alt={service.name}
                      loading="lazy"
                    />
                    <span className="image-number">0{index + 1}</span>
                  </a>
                  <div className="service-card-body">
                    <p className="card-category">{service.category}</p>
                    <h3>{service.name}</h3>
                    <p>{service.description}</p>
                    <div className="card-bottom">
                      <strong>
                        {service.quoteOnly || !service.price
                          ? "Request a quote"
                          : currency(service.price)}{" "}
                        <small>
                          {service.quoteOnly || !service.price
                            ? "· tailored to your event"
                            : service.unit}
                        </small>
                      </strong>
                      <a
                        href={`/order/${service.id}`}
                        aria-label={`Order ${service.name}`}
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                </article>
              </Fragment>
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
              width="1024"
              height="1536"
              loading="lazy"
            />
            <span>Tap to view the full-size poster &#8599;</span>
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
              helps coordinate the details, from arrival and seating to catering
              and the flow of your day.
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
              Enquire about our protocol team <span>&#8599;</span>
            </a>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container split-section">
          <div className="split-photo">
            <img
              src="/images/elegant-event-tables.jpg"
              alt="Elegant event dining setup"
              loading="lazy"
            />
            <div className="photo-caption">
              <strong>Your event, beautifully handled.</strong>
              <span>From first enquiry to final plate.</span>
            </div>
          </div>
          <div className="split-copy">
            <p className="eyebrow">YOUR OCCASION, OUR CARE</p>
            <h2>
              More than catering.
              <br />
              <em>We help bring it all together.</em>
            </h2>
            <p>
              Tell Nancy and the team what you are planning. Request a custom
              menu, catering quotation or event coordination for your
              celebration.
            </p>
            <ul className="check-list">
              <li>Personalised catering quotations</li>
              <li>Traditional Kenyan dishes and custom menus</li>
              <li>Reliable planning and clear communication</li>
              <li>Food delivery for teams and gatherings</li>
            </ul>
            <a className="btn btn-dark" href="/book">
              Start planning <span>↗</span>
            </a>{" "}
            <a
              className="text-link"
              href="https://wa.me/254723548397?text=Hello%20Nanny%20Events%20%26%20Caterers%2C%20I%27d%20like%20a%20catering%20quotation."
              target="_blank"
              rel="noopener"
            >
              WhatsApp us ↗
            </a>
          </div>
        </div>
      </section>
      <EventGallery />
      <section className="section section-warm nanny-gallery-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FROM OUR EVENTS</p>
              <h2>A taste of Nanny's work.</h2>
              <p className="gallery-intro">
                Photos from our catering service, food preparation, menus and
                event setups.
              </p>
            </div>
            <a
              className="text-link"
              href="https://www.facebook.com/NannyCaterersServices/"
              target="_blank"
              rel="noopener"
            >
              More on Facebook ↗
            </a>
          </div>
          <div className="nanny-gallery">
            {galleryPhotos.map(([file, caption], __index) => (
              <Fragment key={__index}>
                <figure className="nanny-gallery-item">
                  <img src={`/images/${file}`} alt={caption} loading="lazy" />
                  <figcaption>{caption}</figcaption>
                </figure>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <p className="eyebrow eyebrow-light">LET'S MAKE IT SPECIAL</p>
            <h2>Have an occasion in mind?</h2>
            <p>
              Share your date, guest count and vision. We'll help you take the
              next step.
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
