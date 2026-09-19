// Centralized payment processing. Every purchase and membership subscription
// goes through processPayment() rather than being marked COMPLETED directly —
// this is the ONE place a real gateway (Razorpay, PayPal, etc.) gets wired in
// later. Nothing in purchaseService or membershipService needs to change when
// that happens; only this file does.
//
// Currently in SIMULATION MODE: no real gateway is connected yet (blocked on
// KYC/phone verification requirements as of this writing). Every payment
// "succeeds" immediately with a generated reference. This is intentional and
// safe for testing — no real money moves, and purchase/membership records are
// still created correctly in the database, so the rest of the app functions
// exactly as it will once a real gateway is connected.
//
// TO CONNECT A REAL GATEWAY LATER:
// Replace the body of processPayment() with an actual call to the gateway's
// API (e.g. razorpay.orders.create(), or verifying a client-side payment
// confirmation). Keep the same input/output shape so nothing else needs to
// change: input { amountRupees, description, metadata }, output
// { success, paymentRef, raw }.

const crypto = require('crypto');

const SIMULATION_MODE = true; // flip to false once a real gateway is wired in below

async function processPayment({ amountRupees, description, metadata = {} }) {
  if (SIMULATION_MODE) {
    // Simulated instant success. paymentRef is clearly marked as fake so it's
    // never mistaken for a real gateway transaction ID in logs or reports.
    const paymentRef = `SIMULATED-${crypto.randomBytes(8).toString('hex')}`;
    return {
      success: true,
      paymentRef,
      raw: { simulated: true, amountRupees, description, metadata },
    };
  }

  // --- Real gateway integration goes here ---
  // Example shape for Razorpay (once KYC/PAN is available):
  //
  // const Razorpay = require('razorpay');
  // const instance = new Razorpay({
  //   key_id: process.env.RAZORPAY_KEY_ID,
  //   key_secret: process.env.RAZORPAY_KEY_SECRET,
  // });
  // const order = await instance.orders.create({
  //   amount: amountRupees * 100, // Razorpay uses paise
  //   currency: 'INR',
  //   notes: metadata,
  // });
  // Actual payment capture then happens client-side (Razorpay Checkout popup)
  // and is verified server-side via a signature check before calling this
  // function again to mark it complete — see Razorpay's docs for the two-step
  // order-then-verify flow.

  throw new Error('No real payment gateway is configured yet.');
}

module.exports = { processPayment, SIMULATION_MODE };
