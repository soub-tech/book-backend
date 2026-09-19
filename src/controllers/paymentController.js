const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/paymentService');
const ApiError = require('../utils/ApiError');

const createIntent = catchAsync(async (req, res) => {
  const { amountRupees, description } = req.body;
  if (!amountRupees || amountRupees <= 0) {
    throw ApiError.badRequest('amountRupees must be a positive number');
  }

  const intent = await paymentService.createPaymentIntent({
    amountRupees,
    description: description || 'Foreword purchase',
    metadata: { userId: req.user.id },
  });

  res.json({ success: true, data: intent });
});

module.exports = { createIntent };
