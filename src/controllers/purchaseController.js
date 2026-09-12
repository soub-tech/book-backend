const catchAsync = require('../utils/catchAsync');
const purchaseService = require('../services/purchaseService');

const purchaseBook = catchAsync(async (req, res) => {
  const purchase = await purchaseService.purchaseBook(req.user.id, req.body);
  res.status(201).json({ success: true, data: purchase });
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

module.exports = { purchaseBook, getMyPurchases, getAllPurchases };
