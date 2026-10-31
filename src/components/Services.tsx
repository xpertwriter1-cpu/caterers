import { Fragment } from "react";
import { currency, type PageData } from "../lib/types";

export default function Services(data: PageData) {
  const { services, selectedCategory } = data;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">OUR SERVICES</p>
          <h1>
            Catering for the moments
            <br />
            <em>that matter.</em>
          </h1>
          <p>
            Request food delivery, traditional Kenyan menus, event catering and
            hospitality support online. No account needed. All prices and
            availability are confirmed individually before you commit.
          </p>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container">
          <div className="filter-row">
            <span className="eyebrow">EXPLORE THE MENU</span>
            <div className="filter-links">
              <a className={!selectedCategory ? "active" : ""} href="/services">
                All services
              </a>
              {["Food", "Event Catering", "Hospitality", "Equipment Hire"].map(
                (c, __index) => (
                  <Fragment key={__index}>
                    <a
                      className={selectedCategory === c ? "active" : ""}
                      href={`/services?category=${encodeURIComponent(c)}`}
                    >
                      {c}
                    </a>
                  </Fragment>
                ),
              )}
            </div>
          </div>
          {!services.length ? (
            <>
              <div className="empty-state">
                <h2>No services in this category yet</h2>
                <p>
                  Please check another category or contact us for a custom
                  request.
                </p>
              </div>
            </>
          ) : null}
          <div className="service-grid">
            {services.map((service, index) => (
              <Fragment key={index}>
                <article className="service-card">
                  <a className="service-image" href={`/order/${service.id}`}>
                    <img
                      src={service.image || "/images/kenyan-food-spread.jpg"}
                      alt={service.name}
                      loading="lazy"
                    />
                    <span className="image-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
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
                            ? "· availability confirmed"
                            : service.unit}
                        </small>
                      </strong>
                      <a href={`/order/${service.id}`}>Order / enquire ↗</a>
                    </div>
                  </div>
                </article>
              </Fragment>
            ))}
          </div>
          <div className="custom-request">
            <div>
              <h2>Have a special menu in mind?</h2>
              <p>
                Ask about kienyeji chicken, pilau, chapati, mukimo, nyama choma,
                custom menus and large guest counts.
              </p>
            </div>
            <a className="btn btn-dark" href="/book">
              Tell us what you need ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
