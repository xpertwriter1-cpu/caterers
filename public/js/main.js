document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav-links");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
  const quantity = document.querySelector("#quantity");
  const total = document.querySelector("#estimated-total");
  if (quantity && total) {
    const price = Number(total.dataset.price || 0);
    const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });
    const quoteOnly = price <= 0;
    const update = () => {
      if (quoteOnly) { total.textContent = "To be confirmed"; return; }
      const q = Math.max(1, Number(quantity.value || 1));
      total.textContent = fmt.format(price * q);
    };
    quantity.addEventListener("input", update);
    update();
  }
  const dateInput = document.querySelector('input[name="eventDate"]');
  if (dateInput) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    dateInput.min = local;
  }
});