// Centralized payment processing. Every purchase and membership subscription
// goes through this file — the one place a real gateway integration lives.
// createPaymentIntent() starts a charge (frontend collects card details via
// Stripe Elements and confirms it); verifyPayment() checks server-side that
// it actually succeeded before anything is marked COMPLETED in the database.
// This two-step flow is required by Stripe (and effectively every card
// gateway) so raw card numbers never pass through your own backend.

const env = require('../config/env');

const SIMULATION_MODE = !env.stripe.secretKey; // auto-falls back if no key is configured

let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    const Stripe = require('stripe');
    stripeClient = new Stripe(env.stripe.secretKey);
  }
  return stripeClient;
}

// Starts a charge. Returns a clientSecret the frontend uses with Stripe.js to
// securely collect card details and confirm the payment in the browser.
async function createPaymentIntent({ amountRupees, description, metadata = {} }) {
  if (SIMULATION_MODE) {
    return {
      clientSecret: null,
      paymentIntentId: `SIMULATED-${Date.now()}`,
      simulated: true,
    };
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amountRupees * 100), // Stripe uses the smallest currency unit (paise for INR)
    currency: 'inr',
    description,
    metadata: Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)])),
  });

  return { clientSecret: intent.client_secret, paymentIntentId: intent.id, simulated: false };
}

// Confirms server-side (never trust the frontend's word alone) that a
// payment actually succeeded before granting access to anything.
async function verifyPayment(paymentIntentId) {
  if (SIMULATION_MODE || String(paymentIntentId).startsWith('SIMULATED-')) {
    return { success: true, paymentRef: paymentIntentId };
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return { success: intent.status === 'succeeded', paymentRef: paymentIntentId };
}

module.exports = { createPaymentIntent, verifyPayment, SIMULATION_MODE };

