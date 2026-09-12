// Ensures password hashes and reset tokens never leak into API responses,
// regardless of which query produced the User object.
function sanitizeUser(user) {
  if (!user) return user;
  const {
    passwordHash,
    passwordResetToken,
    passwordResetExpires,
    ...safe
  } = user;
  return safe;
}

module.exports = { sanitizeUser };
