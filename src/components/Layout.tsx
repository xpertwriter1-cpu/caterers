import { useState, type ReactNode } from "react";
import type { Flash, SessionUser } from "../lib/types";

export function Layout({
  currentUser,
  flash,
  year,
  children,
}: {
  currentUser: SessionUser | null;
  flash: Flash | null;
  year: number;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const logo = (
    <img
      className="brand-logo"
      src="/images/nanny-events-logo.png"
      alt="Nanny Events & Caterers — Food with passion"
    />
  );
  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <a
            className="brand"
            href="/"
            aria-label="Nanny Events & Caterers home"
          >
            {logo}
          </a>
          <button
            className="nav-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <nav
            id="main-navigation"
            className={`nav-links${menuOpen ? " is-open" : ""}`}
          >
            <a href="/">Home</a>
            <a href="/services">Services &amp; Menu</a>
            <a href="/book">Book an Event</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a
              className="nav-whatsapp"
              href="https://wa.me/254723548397?text=Hello%20Nanny%20Events%20%26%20Caterers%2C%20I%27d%20like%20to%20make%20an%20enquiry."
              target="_blank"
              rel="noopener"
            >
              WhatsApp
            </a>
            {currentUser ? (
              <>
                <a href={currentUser.role === "admin" ? "/admin" : "/account"}>
                  {currentUser.role === "admin" ? "Admin" : "My Account"}
                  {currentUser.name ? ` (${currentUser.name})` : ""}
                </a>
                <form
                  className="logout-form"
                  action="/api/logout"
                  method="post"
                >
                  <button className="nav-logout" type="submit">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <a href="/login">Sign in</a>
                <a className="nav-cta" href="/register">
                  Get Started
                </a>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <div className="container flash-area">
          {flash && (
            <div role="status" className={`alert alert-${flash.type}`}>
              {flash.message}
            </div>
          )}
        </div>
        {children}
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <a
              className="brand brand-light"
              href="/"
              aria-label="Nanny Events & Caterers home"
            >
              {logo}
            </a>
            <p>
              Traditional Kenyan flavours, thoughtful catering and event
              planning for weddings, dowry ceremonies, corporate functions and
              private celebrations.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="/services">Our services</a>
            <a href="/book">Book catering</a>
            <a href="/contact">Contact us</a>
          </div>
          <div>
            <h3>Plan with us</h3>
            <p>
              Weddings · Dowry ceremonies · Corporate events · Private
              celebrations · Food delivery
            </p>
            <p>
              <a href="tel:+254723548397">0723 548 397</a>
              <br />
              <a href="tel:+254733548397">0733 548 397</a>
            </p>
            <a
              href="https://www.facebook.com/NannyCaterersServices/"
              target="_blank"
              rel="noopener"
            >
              Facebook
            </a>
            <a
              href="https://www.instagram.com/nannycaterers/"
              target="_blank"
              rel="noopener"
            >
              Instagram
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          © {year} Nanny Events &amp; Caterers. All rights reserved. · Nairobi,
          Kenya
        </div>
      </footer>
    </>
  );
}
