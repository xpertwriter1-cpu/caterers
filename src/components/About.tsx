export default function About() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">ABOUT NANNY EVENTS AND CATERERS</p>
          <h1>
            We bring people together
            <br />
            <em>through good food.</em>
          </h1>
          <p>
            Nanny Events and Caterers is a Kenyan catering company dedicated to
            providing exceptional food and catering experiences for
            individuals, families, businesses and institutions.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container split-section">
          <div className="split-photo">
            <img
              src="/images/catering-team-buffet.jpg"
              alt="Nanny Events and Caterers team at a buffet"
            />
          </div>
          <div className="split-copy">
            <p className="eyebrow">OUR STORY</p>
            <h2>
              Quality and quantity.
              <br />
              <em>That’s our promise.</em>
            </h2>
            <p>
              We specialise in outside catering, corporate functions, weddings,
              ruracio ceremonies, private celebrations and traditional Kenyan
              dishes. Our business is built on a simple but powerful
              philosophy: Quality and Quantity.
            </p>
            <p>
              We understand that food plays an important role in bringing
              people together. That is why we are passionate about preparing
              delicious meals, offering generous portions and delivering
              services that exceed our clients’ expectations.
            </p>
            <p>
              Our team works closely with every client to understand their
              needs, preferences and budget, ensuring that every catering
              assignment receives the attention it deserves. Whether it is a
              small gathering or a large event, we bring the same commitment,
              professionalism and passion to every occasion.
            </p>
            <p>
              At Nanny Events and Caterers, your satisfaction is our success.
              We don’t just cater for events; we create memorable food
              experiences.
            </p>
            <a className="btn btn-dark" href="/book">
              Plan your event ↗
            </a>
          </div>
        </div>
      </section>
      <section className="section section-warm">
        <div className="container">
          <div className="about-purpose-grid">
            <article className="purpose-card">
              <p className="eyebrow">OUR MISSION</p>
              <h2>Delicious, quality catering for every occasion.</h2>
              <p>
                To provide quality, delicious and affordable catering services
                through excellent food preparation, generous portions,
                professionalism and outstanding customer care.
              </p>
            </article>
            <article className="purpose-card">
              <p className="eyebrow">OUR VISION</p>
              <h2>To be among Kenya’s most trusted caterers.</h2>
              <p>
                To become one of Kenya’s most trusted and preferred catering
                companies, recognised for quality, reliability, innovation and
                exceptional customer experiences.
              </p>
            </article>
          </div>
          <div className="values-block">
            <p className="eyebrow">OUR CORE VALUES</p>
            <h2>The way we serve.</h2>
            <ul className="value-list">
              <li>Quality and excellence</li>
              <li>Professionalism and integrity</li>
              <li>Reliability and punctuality</li>
              <li>Customer satisfaction</li>
              <li>Hygiene and food safety</li>
              <li>Passion for food and hospitality</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
