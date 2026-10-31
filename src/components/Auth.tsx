import { type PageData } from "../lib/types";

export default function Auth(data: PageData) {
  const { services, bookings, orders, mode, audience } = data;

  return (
    <>
      <section className="auth-section">
        <div className="auth-image">
          <div>
            <p className="eyebrow eyebrow-light">A WARM WELCOME AWAITS</p>
            <h2>
              Good food.
              <br />
              Great company.
            </h2>
            <p>
              {audience === "admin"
                ? "Sign in to review bookings, manage food orders and update services."
                : "Plan an event, request catering or follow your orders."}
            </p>
          </div>
        </div>
        <div className="auth-panel">
          <div className="auth-form-wrap">
            <p className="eyebrow">
              {mode === "register"
                ? "JOIN NANNY EVENTS & CATERERS"
                : audience === "admin"
                  ? "ADMINISTRATOR ACCESS"
                  : "WELCOME BACK"}
            </p>
            <h1>
              {mode === "register"
                ? "Create your account."
                : audience === "admin"
                  ? "Admin sign in."
                  : "Sign in to continue."}
            </h1>
            <p className="muted">
              {mode === "register"
                ? "Keep your event requests and orders together."
                : audience === "admin"
                  ? "Access the dashboard to check and manage customer orders."
                  : "Your bookings and food orders are waiting."}
            </p>
            <form
              id="auth-sign-in"
              className="auth-form"
              method="post"
              action={
                mode === "register"
                  ? "/api/register"
                  : audience === "admin"
                    ? "/api/admin/login"
                    : "/api/login"
              }
            >
              {mode === "register" ? (
                <>
                  <div className="auth-field">
                    <label htmlFor="auth-name">Full name</label>
                    <input
                      id="auth-name"
                      name="name"
                      required
                      maxLength={100}
                      autoComplete="name"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="auth-phone">
                      Phone number <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      name="phone"
                      maxLength={30}
                      autoComplete="tel"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>
                </>
              ) : null}
              <div className="auth-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  name="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  name="password"
                  required
                  minLength={mode === "register" ? 10 : 1}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  aria-describedby={
                    mode === "register" ? "password-hint" : undefined
                  }
                />
                {mode === "register" ? (
                  <>
                    <p id="password-hint" className="auth-hint">
                      Use at least 10 characters.
                    </p>
                  </>
                ) : null}
              </div>
              <button className="btn btn-dark btn-full" type="submit">
                {mode === "register" ? "Create account" : "Sign in"}{" "}
                <span aria-hidden="true">&#8599;</span>
              </button>
            </form>
            <p className="auth-switch">
              {mode === "register"
                ? "Already have an account?"
                : "New to Nanny Events & Caterers?"}{" "}
              <a href={mode === "register" ? "/login" : "/register"}>
                {mode === "register" ? "Sign in" : "Create an account"}
              </a>
            </p>
            {mode === "login" ? (
              <>
                <div
                  className="auth-options"
                  aria-label="More ways to continue"
                >
                  {audience === "admin" ? (
                    <>
                      <div className="auth-option">
                        <span>FOR THE TEAM</span>
                        <strong>Admin sign in</strong>
                        <small>
                          Check and manage bookings, orders and services.
                        </small>
                      </div>
                      <a className="auth-option" href="/login">
                        <span>FOR CUSTOMERS</span>
                        <strong>Guest account sign in</strong>
                        <small>Review your bookings and food orders.</small>
                      </a>
                    </>
                  ) : (
                    <>
                      <a className="auth-option" href="/admin/login">
                        <span>FOR THE TEAM</span>
                        <strong>Admin sign in</strong>
                        <small>
                          Check and manage bookings, orders and services.
                        </small>
                      </a>
                      <div className="auth-option">
                        <span>BOOKING WITHOUT AN ACCOUNT</span>
                        <strong>Continue as a guest</strong>
                        <small>
                          No account needed to book catering or request food.
                        </small>
                        <span className="auth-option-links">
                          <a href="/book">Book an event</a>
                          <a href="/services">Browse food & services</a>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : null}
            <p className="form-note">
              Use a unique password. Do not share your account details.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
