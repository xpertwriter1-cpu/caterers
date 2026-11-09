import { currency, type PageData } from "../lib/types";

const cateringServices = [
  {
    title: "Wedding and Ruracio Catering",
    image: "event-banquet.jpg",
    description:
      "We provide catering for weddings, ruracio ceremonies, traditional weddings, engagements and family celebrations. We work with you to create menus that reflect your preferences and occasion.",
  },
  {
    title: "Corporate Catering",
    image: "professional-food-service.jpg",
    description:
      "Professional catering for corporate meetings, conferences, seminars, workshops, staff training, office lunches and business functions.",
  },
  {
    title: "Traditional Kenyan Catering",
    image: "kenyan-food-spread.jpg",
    description:
      "Enjoy authentic Kenyan dishes prepared with flavour and care, including traditional vegetables, kienyeji chicken, nyama choma, mukimo, chapati, ugali and other local favourites.",
  },
  {
    title: "Private and Social Events",
    image: "elegant-event-tables.jpg",
    description:
      "Catering for birthdays, graduations, anniversaries, family gatherings, baby showers, home celebrations and special occasions.",
  },
  {
    title: "Outside Catering",
    image: "outdoor-event-catering.jpg",
    description:
      "We bring our catering expertise to your preferred venue, providing food preparation, delivery and service according to your event requirements.",
  },
  {
    title: "Institutional and Group Catering",
    image: "buffet-spread.jpg",
    description:
      "Flexible meal solutions for schools, organisations, churches, institutions and group functions.",
  },
];

const menus = [
  {
    title: "Traditional Kenyan Cuisine",
    items: [
      "Mukimo",
      "Ugali",
      "Chapati",
      "Rice and pilau",
      "Githeri",
      "Traditional vegetables",
      "Kienyeji chicken",
      "Beef stew",
      "Goat meat and nyama choma",
      "Fish",
      "Assorted traditional accompaniments",
    ],
  },
  {
    title: "Continental and Modern Cuisine",
    items: [
      "Assorted rice dishes",
      "Pasta",
      "Roasted and grilled potatoes",
      "Assorted salads",
      "Grilled chicken",
      "Beef dishes",
      "Fish preparations",
      "Assorted vegetables",
    ],
  },
  {
    title: "Breakfast and Tea Break Menus",
    items: [
      "Tea and coffee",
      "Fresh juices",
      "Mandazi",
      "Samosas",
      "Sausages",
      "Sandwiches",
      "Cakes and pastries",
      "Fresh fruits",
    ],
  },
  {
    title: "Snacks and Refreshments",
    items: [
      "Assorted pastries",
      "Finger foods",
      "Fresh fruit platters",
      "Soft drinks and beverages",
      "Tea and coffee stations",
    ],
  },
];

export default function Services(data: PageData) {
  const { services, selectedCategory } = data;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">OUR SERVICES</p>
          <h1>
            Good food for the moments
            <br />
            <em>that matter.</em>
          </h1>
          <p>
            From weddings and corporate functions to private celebrations and
            traditional Kenyan cuisine, we create catering experiences to suit
            your occasion, preferences and budget.
          </p>
        </div>
      </section>

      <section className="section section-warm">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CATERING FOR EVERY OCCASION</p>
              <h2>Our services.</h2>
            </div>
          </div>
          <div className="service-grid">
            {cateringServices.map((service, index) => (
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

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A TASTE OF EXCELLENCE IN EVERY SERVING</p>
              <h2>Our menus.</h2>
              <p className="gallery-intro">
                We offer a wide variety of freshly prepared meals to suit
                different occasions, tastes and budgets. Our menus can be
                customised to meet your event requirements.
              </p>
            </div>
            <a className="text-link" href="/book">
              Request a customised menu ↗
            </a>
          </div>
          <div className="menu-grid">
            {menus.map((menu) => (
              <article className="menu-card" key={menu.title}>
                <h3>{menu.title}</h3>
                <ul>
                  {menu.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="custom-request">
            <div>
              <h2>Need a customised menu?</h2>
              <p>
                We create customised menus for weddings, ruracio ceremonies,
                corporate functions, birthdays and other celebrations. Contact
                us for a quotation.
              </p>
            </div>
            <a className="btn btn-dark" href="/book">
              Request a quotation ↗
            </a>
          </div>
        </div>
      </section>

      <section className="section section-warm">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AVAILABLE SERVICES</p>
              <h2>Browse our current listings.</h2>
              <p className="gallery-intro">
                Availability and final prices are confirmed individually
                before you commit.
              </p>
            </div>
          </div>
          <div className="filter-row">
            <span className="eyebrow">EXPLORE THE CATALOGUE</span>
            <div className="filter-links">
              <a className={!selectedCategory ? "active" : ""} href="/services">
                All services
              </a>
              {["Food", "Event Catering", "Hospitality", "Equipment Hire"].map(
                (category) => (
                  <a
                    className={selectedCategory === category ? "active" : ""}
                    href={`/services?category=${encodeURIComponent(category)}`}
                    key={category}
                  >
                    {category}
                  </a>
                ),
              )}
            </div>
          </div>
          {!services.length ? (
            <div className="empty-state">
              <h2>No listed items in this category yet</h2>
              <p>
                Contact us for a custom catering request or menu quotation.
              </p>
            </div>
          ) : null}
          <div className="service-grid">
            {services.map((service, index) => (
              <article className="service-card" key={service.id}>
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
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
