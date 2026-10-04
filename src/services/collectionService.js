const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');
const { slugify } = require('./authorService');

async function listCollections() {
  return prisma.collection.findMany({
    orderBy: { title: 'asc' },
    include: { _count: { select: { books: true } } },
  });
}

async function getCollectionBySlug(slug) {
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: { books: { where: { status: 'PUBLISHED' } } },
  });
  if (!collection) throw ApiError.notFound('Collection not found');
  return collection;
}

async function getCollectionById(id) {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) throw ApiError.notFound('Collection not found');
  return collection;
}

async function createCollection(data) {
  const slug = slugify(data.slug || data.title);
  const existingSlug = await prisma.collection.findUnique({ where: { slug } });
  if (existingSlug) throw ApiError.conflict('A collection with this slug already exists');

  return prisma.collection.create({ data: { title: data.title, description: data.description, slug } });
}

async function updateCollection(id, data) {
  await getCollectionById(id);
  const updateData = { ...data };
  if (data.slug) updateData.slug = slugify(data.slug);
  return prisma.collection.update({ where: { id }, data: updateData });
}

async function deleteCollection(id) {
  await getCollectionById(id);
  return prisma.collection.delete({ where: { id } });
}

async function addBookToCollection(id, bookId) {
  await getCollectionById(id);
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw ApiError.notFound('Book not found');

  return prisma.collection.update({
    where: { id },
    data: { books: { connect: { id: bookId } } },
    include: { books: true },
  });
}

async function removeBookFromCollection(id, bookId) {
  await getCollectionById(id);
  return prisma.collection.update({
    where: { id },
    data: { books: { disconnect: { id: bookId } } },
    include: { books: true },
  });
}

module.exports = {
  listCollections,
  getCollectionBySlug,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
};
