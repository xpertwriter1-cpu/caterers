import { type PageData } from "../lib/types";

export default function About() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow eyebrow-light">ABOUT NANNY EVENTS & CATERERS</p>
          <h1>
            Hospitality is how
            <br />
            <em>people feel welcome.</em>
          </h1>
          <p>
            Nanny Events & Caterers is a Nairobi-based catering and event
            planning service led by Nancy, serving celebrations through food,
            service and thoughtful coordination.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container split-section">
          <div className="split-photo">
            <img
              src="/images/catering-team-buffet.jpg"
              alt="Catering team preparing food"
            />
          </div>
          <div className="split-copy">
            <p className="eyebrow">OUR APPROACH</p>
            <h2>
              Warm service.
              <br />
              Thoughtful details.
            </h2>
            <p>
              Nanny Events & Caterers supports weddings, dowry ceremonies,
              corporate functions and private celebrations. The menu can include
              traditional Kenyan dishes and kienyeji chicken, with custom party
              menus discussed for each occasion. Send an enquiry with your date,
              venue and guest count so the team can confirm availability and
              prepare a quotation.
            </p>
            <p className="small-muted">
              Based in Nairobi, Kenya. Event dates, menu options, delivery zones
              and final quotations are confirmed directly with the team.
            </p>
            <a className="btn btn-dark" href="/book">
              Plan your event ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
