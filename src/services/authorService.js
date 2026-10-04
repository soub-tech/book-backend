const prisma = require('../config/db');
const ApiError = require('../utils/ApiError');

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function listAuthors() {
  return prisma.author.findMany({ orderBy: { name: 'asc' } });
}

async function getAuthorBySlug(slug) {
  const author = await prisma.author.findUnique({ where: { slug } });
  if (!author) throw ApiError.notFound('Author not found');
  return author;
}

async function getAuthorById(id) {
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) throw ApiError.notFound('Author not found');
  return author;
}

// Books are linked by exact text match against Book.author (a plain string
// field), not a foreign key — keeps the existing book create/update flow
// completely unchanged. Renaming an author here does not retroactively
// relink books saved under the old name.
async function getBooksForAuthor(authorName) {
  return prisma.book.findMany({
    where: { author: authorName, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
  });
}

async function createAuthor(data) {
  const slug = slugify(data.slug || data.name);
  const existingSlug = await prisma.author.findUnique({ where: { slug } });
  if (existingSlug) throw ApiError.conflict('An author with this slug already exists');

  return prisma.author.create({ data: { name: data.name, role: data.role, bio: data.bio, slug } });
}

async function updateAuthor(id, data) {
  await getAuthorById(id);
  const updateData = { ...data };
  if (data.slug) updateData.slug = slugify(data.slug);
  return prisma.author.update({ where: { id }, data: updateData });
}

async function deleteAuthor(id) {
  await getAuthorById(id);
  return prisma.author.delete({ where: { id } });
}

module.exports = {
  listAuthors,
  getAuthorBySlug,
  getAuthorById,
  getBooksForAuthor,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  slugify,
};
