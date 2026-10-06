// Centralized email sending. Every part of the app that needs to email a
// user goes through the functions here, not through Resend's SDK directly —
// keeps the actual provider swappable in one place, same pattern as
// paymentService.js for payments.

const env = require('../config/env');

let resendClient = null;
function getResend() {
  if (!resendClient) {
    const { Resend } = require('resend');
    resendClient = new Resend(env.resend.apiKey);
  }
  return resendClient;
}

const EMAIL_ENABLED = Boolean(env.resend.apiKey);

async function sendEmail({ to, subject, html, replyTo }) {
  if (!EMAIL_ENABLED) {
    // No API key configured — log instead of failing, so the rest of the
    // app (signup, purchases) keeps working in environments without email
    // set up (e.g. local development).
    console.log(`[email disabled] Would send to ${to}: ${subject}`);
    return { sent: false };
  }

  try {
    const resend = getResend();
    await resend.emails.send({
      from: env.resend.fromAddress,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
    return { sent: true };
  } catch (err) {
    // Email failures should never break the underlying action (a purchase
    // still succeeded even if the confirmation email didn't send) — log and
    // move on rather than throwing.
    console.error('Email send failed:', err.message);
    return { sent: false };
  }
}

function wrapper(bodyHtml) {
  return `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 20px; border-bottom: 1px solid #e5e5e5; padding-bottom: 12px;">Foreword</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">Foreword — Books for better thinking.</p>
    </div>
  `;
}

async function sendPasswordResetEmail(to, resetLink) {
  return sendEmail({
    to,
    subject: 'Reset your Foreword password',
    html: wrapper(`
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}" style="background:#111;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Reset password</a></p>
      <p style="font-size: 13px; color: #666;">If you didn't request this, you can safely ignore this email. This link expires soon for your security.</p>
    `),
  });
}

async function sendPurchaseConfirmationEmail(to, { bookTitle, amount }) {
  return sendEmail({
    to,
    subject: `Order confirmed: ${bookTitle}`,
    html: wrapper(`
      <p>Thank you for your purchase.</p>
      <p><strong>${bookTitle}</strong> — ₹${amount}</p>
      <p>It's ready in your library now.</p>
    `),
  });
}

async function sendMembershipConfirmationEmail(to, { planName, expiryDate }) {
  return sendEmail({
    to,
    subject: `Welcome to ${planName}`,
    html: wrapper(`
      <p>Your membership is active.</p>
      <p><strong>${planName}</strong> — renews ${new Date(expiryDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
      <p>Enjoy the expanded library.</p>
    `),
  });
}

// Sent to the site's SUPPORT_EMAIL inbox whenever someone submits the public
// contact form (see contactController.js). replyTo is set to the visitor's
// own email so support can just hit "Reply" in their inbox.
async function sendContactMessage(to, { name, email, subjectLabel, message }) {
  return sendEmail({
    to,
    subject: `[Contact] ${subjectLabel} — from ${name}`,
    html: wrapper(`
      <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
      <p><strong>Topic:</strong> ${subjectLabel}</p>
      <p style="white-space: pre-wrap;">${message}</p>
    `),
    replyTo: email,
  });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPurchaseConfirmationEmail,
  sendMembershipConfirmationEmail,
  sendContactMessage,
  EMAIL_ENABLED,
};
