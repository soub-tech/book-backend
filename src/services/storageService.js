const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const { createClient } = require('@supabase/supabase-js');
require('../config/env'); // makes sure .env is loaded
const ApiError = require('../utils/ApiError');

// Supabase Storage. Needs two env vars on the server:
//   SUPABASE_URL                e.g. https://abcdxyz.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   the secret key — backend only, never the frontend
// Buckets (create in the Supabase dashboard): "covers" (public) and "books" (private).
const COVERS_BUCKET = process.env.SUPABASE_COVERS_BUCKET || 'covers';
const BOOKS_BUCKET = process.env.SUPABASE_BOOKS_BUCKET || 'books';

let client;
function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('File storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

function randomKey(originalname) {
  return `${crypto.randomBytes(16).toString('hex')}${path.extname(originalname || '').toLowerCase()}`;
}

// Returns the full public URL to store as Book.coverImageUrl.
async function uploadCover(file) {
  const supabase = getClient();
  const key = randomKey(file.originalname);
  const { error } = await supabase.storage
    .from(COVERS_BUCKET)
    .upload(key, file.buffer, { contentType: file.mimetype, cacheControl: '31536000' });
  if (error) throw new Error(`Cover upload failed: ${error.message}`);
  return supabase.storage.from(COVERS_BUCKET).getPublicUrl(key).data.publicUrl;
}

// Returns "s3:<key>" to store as Book.fileUrl (the "s3:" prefix just marks
// "stored in cloud storage" vs. an old local path).
async function uploadBookFile(file) {
  const key = randomKey(file.originalname);
  const { error } = await getClient()
    .storage.from(BOOKS_BUCKET)
    .upload(key, file.buffer, { contentType: file.mimetype });
  if (error) throw new Error(`Book upload failed: ${error.message}`);
  return `s3:${key}`;
}

async function getBookFileStream(fileUrl) {
  const key = fileUrl.slice(3); // strip "s3:"
  const { data, error } = await getClient().storage.from(BOOKS_BUCKET).download(key);
  if (error || !data) throw ApiError.notFound('The book file is missing from storage');
  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    stream: Readable.from(buffer),
    contentType: data.type || 'application/pdf',
    contentLength: buffer.length,
  };
}

module.exports = { uploadCover, uploadBookFile, getBookFileStream };
