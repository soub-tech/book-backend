const catchAsync = require('../utils/catchAsync');
const purchaseService = require('../services/purchaseService');

const purchaseBook = catchAsync(async (req, res) => {
  const purchase = await purchaseService.purchaseBook(req.user.id, req.body);
  res.status(201).json({ success: true, data: purchase });
});

const checkoutCart = catchAsync(async (req, res) => {
  const { paymentIntentId, bookIds } = req.body;
  const purchases = await purchaseService.checkoutCart(req.user.id, { paymentIntentId, bookIds });
  res.status(201).json({ success: true, data: purchases });
});

const getMyPurchases = catchAsync(async (req, res) => {
  const purchases = await purchaseService.getUserPurchases(req.user.id);
  res.json({ success: true, data: purchases });
});

const getAllPurchases = catchAsync(async (req, res) => {
  const result = await purchaseService.getAllPurchases({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json({ success: true, data: result });
});

module.exports = { purchaseBook, checkoutCart, getMyPurchases, getAllPurchases };
