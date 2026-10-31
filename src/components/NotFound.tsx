import { type PageData } from "../lib/types";

export default function NotFound() {
  return (
    <>
      <section className="empty-page">
        <div className="container">
          <p className="eyebrow">404 · NOT FOUND</p>
          <h1>
            We couldn't find
            <br />
            <em>that page.</em>
          </h1>
          <p>The page may have moved, or the link may be incorrect.</p>
          <a className="btn btn-dark" href="/">
            Back to home ↗
          </a>
        </div>
      </section>
    </>
  );
}
