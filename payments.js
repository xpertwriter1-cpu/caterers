const crypto = require("node:crypto");

function createPayments(env = process.env, request = fetch) {
  const configured = Boolean(env.PAYSTACK_SECRET_KEY && env.PUBLIC_BASE_URL);
  async function api(path, body) {
    const response = await request(`https://api.paystack.co${path}`, {
      method: body ? "POST" : "GET", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json();
    if (!response.ok || !result.status) throw new Error("Payment provider request failed. Please try again.");
    return result.data;
  }
  return {
    configured,
    async initialize(order) {
      if (!configured) throw new Error("Online payments are not configured yet.");
      return api("/transaction/initialize", {
        email: order.requesterEmail, amount: Math.round(order.total * 100), currency: "KES",
        reference: order.paymentReference,
        channels: order.paymentMethod === "M-PESA" ? ["mobile_money"] : ["card"],
        callback_url: `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/requests/${order.accessToken}/verify`
      });
    },
    async verify(order) {
      if (!configured || !order.paymentReference) return false;
      const data = await api(`/transaction/verify/${encodeURIComponent(order.paymentReference)}`);
      return data.status === "success" && data.reference === order.paymentReference &&
        data.currency === "KES" && data.amount === Math.round(order.total * 100) &&
        data.customer?.email?.toLowerCase() === order.requesterEmail.toLowerCase();
    },
    validSignature(body, signature) {
      if (!env.PAYSTACK_SECRET_KEY || typeof signature !== "string" || !/^[a-f0-9]{128}$/i.test(signature)) return false;
      const digest = crypto.createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(body).digest();
      return crypto.timingSafeEqual(digest, Buffer.from(signature, "hex"));
    }
  };
}
module.exports = { createPayments };
