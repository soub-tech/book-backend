# Book Reading Platform — Backend

Node.js/Express + PostgreSQL (Prisma ORM) backend for a digital book platform
with free/paid/membership books, purchases, subscriptions, and reading-progress
tracking.

## Stack

- Express 4, Prisma 5, PostgreSQL (SQLite-compatible for local dev)
- JWT access tokens (short-lived) + rotating refresh tokens (httpOnly cookie, revocable)
- bcrypt password hashing, Zod input validation, Helmet, rate limiting
- Multer for cover image / book file uploads
- Role-based access control (USER / ADMIN)

## Setup

```bash
npm install
cp .env.example .env        # fill in real secrets
# For quick local testing without Postgres, edit prisma/schema.prisma:
#   datasource db { provider = "sqlite" ... }  and DATABASE_URL="file:./dev.db"

npx prisma migrate dev --name init
npm run seed                 # creates admin@example.com / Admin@12345
npm run dev                  # http://localhost:5000
```

## Architecture

```
src/
  config/       env + Prisma client singleton
  middleware/   auth (JWT + RBAC), validate (Zod), upload (Multer), rateLimiter, errorHandler
  services/     business logic — authService, bookService, purchaseService,
                membershipService, progressService (all DB access goes through here)
  controllers/  thin HTTP layer — parse req, call service, shape response
  routes/       route -> middleware -> controller wiring
  utils/        ApiError, catchAsync, tokens, validators, sanitize
```

Adding a feature (reviews, bookmarks, reading goals, etc.) means: add a Prisma
model, a service file, a controller, a route file, and register it in
`src/routes/index.js`. Nothing else needs to change.

## Core security decisions

- **Access control lives in one place.** `bookService.userHasAccess()` /
  `assertAccess()` is the only function that decides whether a user may read a
  book. Every route that returns book content or accepts reading-progress
  writes calls it — the frontend's belief about access is never trusted.
- **Progress writes require access.** `POST /api/progress` re-checks access
  before writing, so a user can't manufacture a "completed" record for a book
  they never purchased.
- **Refresh tokens are stored (hashed) and revocable**, unlike a bare JWT —
  logout, logout-all-devices, and password reset all invalidate them
  server-side.
- **Password reset doesn't leak account existence** — `forgot-password`
  always returns the same response whether or not the email is registered.
- **Duplicate purchases are prevented at the DB level** via a
  `@@unique([userId, bookId])` constraint, not just application logic.
- **Membership expiry is checked live** (`expiryDate > now()`) on every access
  check, not just via a possibly-stale `status` field; an hourly sweep job
  keeps `status` itself in sync for admin views/reports.

## API summary

All routes are prefixed with `/api`.

| Area | Endpoint | Auth |
|---|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`, `/forgot-password`, `/reset-password` | public / self |
| Users | `GET/PATCH /users/me`, `GET /users/me/dashboard` | user |
| Books | `GET /books`, `GET /books/:id`, `GET /books/:id/read` | public / entitled user |
| Books (admin) | `POST/PATCH/DELETE /books/:id`, `POST /books/:id/cover`, `POST /books/:id/file`, `GET /books/:id/stats` | admin |
| Purchases | `POST /purchases`, `GET /purchases/me` | user |
| Purchases (admin) | `GET /purchases` | admin |
| Memberships | `GET /memberships/plans`, `POST /memberships/subscribe`, `GET /memberships/me`, `GET /memberships/me/history`, `POST /memberships/me/:id/cancel` | public / user |
| Memberships (admin) | `POST/PATCH/DELETE /memberships/plans/:id`, `GET /memberships` | admin |
| Progress | `POST /progress`, `GET /progress/continue-reading`, `GET /progress/history`, `GET /progress/:bookId` | user |
| Admin | `GET /admin/stats`, `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/active`, `PATCH /admin/users/:id/role` | admin |

Every response is `{ success: boolean, data?, message?, details? }`.
Send the access token as `Authorization: Bearer <token>`.

## Not included (intentionally out of scope, but the architecture supports them)

- A real payment gateway integration (Stripe/PayPal) — `paymentRef` fields are
  ready to store the gateway's transaction ID; wire the charge call into
  `purchaseService.purchaseBook` / `membershipService.subscribe` before the
  DB write.
- Outbound email delivery (`nodemailer` is installed; hook it up in a
  `services/emailService.js` and call it from `authController.forgotPassword`).
- File storage on S3/Cloud Storage instead of local disk — swap
  `middleware/upload.js`'s disk storage for a cloud storage engine; the rest
  of the app only deals with the resulting URL, so nothing else changes.
