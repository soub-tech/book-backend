const catchAsync = require('../utils/catchAsync');
const authorService = require('../services/authorService');

const listAuthors = catchAsync(async (req, res) => {
  const authors = await authorService.listAuthors();
  res.json({ success: true, data: authors });
});

const getAuthorBySlug = catchAsync(async (req, res) => {
  const author = await authorService.getAuthorBySlug(req.params.slug);
  const books = await authorService.getBooksForAuthor(author.name);
  res.json({ success: true, data: { ...author, books } });
});

const createAuthor = catchAsync(async (req, res) => {
  const author = await authorService.createAuthor(req.body);
  res.status(201).json({ success: true, data: author });
});

const updateAuthor = catchAsync(async (req, res) => {
  const author = await authorService.updateAuthor(req.params.id, req.body);
  res.json({ success: true, data: author });
});

const deleteAuthor = catchAsync(async (req, res) => {
  await authorService.deleteAuthor(req.params.id);
  res.json({ success: true, message: 'Author deleted' });
});

module.exports = { listAuthors, getAuthorBySlug, createAuthor, updateAuthor, deleteAuthor };
