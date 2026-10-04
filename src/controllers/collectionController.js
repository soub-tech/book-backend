const catchAsync = require('../utils/catchAsync');
const collectionService = require('../services/collectionService');

const listCollections = catchAsync(async (req, res) => {
  const collections = await collectionService.listCollections();
  res.json({ success: true, data: collections });
});

const getCollectionBySlug = catchAsync(async (req, res) => {
  const collection = await collectionService.getCollectionBySlug(req.params.slug);
  res.json({ success: true, data: collection });
});

const createCollection = catchAsync(async (req, res) => {
  const collection = await collectionService.createCollection(req.body);
  res.status(201).json({ success: true, data: collection });
});

const updateCollection = catchAsync(async (req, res) => {
  const collection = await collectionService.updateCollection(req.params.id, req.body);
  res.json({ success: true, data: collection });
});

const deleteCollection = catchAsync(async (req, res) => {
  await collectionService.deleteCollection(req.params.id);
  res.json({ success: true, message: 'Collection deleted' });
});

const addBook = catchAsync(async (req, res) => {
  const collection = await collectionService.addBookToCollection(req.params.id, req.body.bookId);
  res.json({ success: true, data: collection });
});

const removeBook = catchAsync(async (req, res) => {
  const collection = await collectionService.removeBookFromCollection(req.params.id, req.params.bookId);
  res.json({ success: true, data: collection });
});

module.exports = { listCollections, getCollectionBySlug, createCollection, updateCollection, deleteCollection, addBook, removeBook };
