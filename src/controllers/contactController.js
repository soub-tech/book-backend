const catchAsync = require('../utils/catchAsync');
const emailService = require('../services/emailService');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const SUBJECT_LABELS = {
  order: 'Order support',
  membership: 'Membership & billing',
  reading: 'Digital reading help',
  rights: 'Authors, publishers & rights',
  other: 'Something else',
};

const sendContactMessage = catchAsync(async (req, res) => {
  if (!env.supportEmail) {
    throw ApiError.internal('Contact form is not configured yet');
  }
  const { name, email, subject, message } = req.body;
  await emailService.sendContactMessage(env.supportEmail, {
    name,
    email,
    subjectLabel: SUBJECT_LABELS[subject] || 'Something else',
    message,
  });
  res.json({ success: true, message: "Message sent. We'll reply within one business day." });
});

module.exports = { sendContactMessage };
