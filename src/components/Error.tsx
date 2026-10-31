import { type PageData } from "../lib/types";

export default function Error(data: PageData) {
  const { message } = data;

  return (
    <>
      <section className="empty-page">
        <div className="container">
          <p className="eyebrow">A LITTLE DETOUR</p>
          <h1>
            Something went
            <br />
            <em>wrong.</em>
          </h1>
          <p>{message}</p>
          <a className="btn btn-dark" href="/">
            Return home ↗
          </a>
        </div>
      </section>
    </>
  );
}
