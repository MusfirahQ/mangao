# Mangao — Order it. Get it.

Mangao is a full-stack ordering app for food, groceries and everyday essentials in Lahore.
Customers order from restaurants and shops in one basket, stores manage their orders from a dashboard,
and an admin runs the whole platform.

Web Technologies course project: frontend (midterm) + backend (final).

## Features

**Customers**
- Sign up / log in (passwords hashed with bcrypt, session in an HttpOnly cookie)
- Browse restaurants and shops, filter, sort, search every item
- One basket across several stores; per-store delivery fee, free-delivery threshold and minimum order
- Delivery or pickup, saved addresses, scheduled time, rider tip, order notes
- Promo code `MANGO150` (Rs. 150 off, once per account), checked on the server
- Checkout: prices, fees and discounts are recalculated on the server, so they can't be changed in the browser
- Live order tracking (updates automatically): placed → accepted → preparing → on the way / ready → delivered / collected
- Cancel before the store accepts, reorder, rate completed orders (updates the store rating)
- Favourite items and stores, profile, change password, download my data, delete account
- Help: report a problem on an order, and message support (the admin replies in the same chat)
- Responsive (mobile bottom bar), dark mode, accessible forms and keyboard support

**Store partners**
- "Sell on Mangao" application → admin approves the store
- Dashboard: new orders appear automatically, accept / decline, move orders through each step
- Open / close the store, set delivery time, fee and minimum order
- Manage the menu: add items, change prices, mark sold out, delete

**Admin**
- Platform stats, every active order (can move or cancel any order)
- Approve / suspend stores, assign a store owner by email
- Reply to and resolve problem reports, reply to customer messages, see users

Payments: cash on delivery / at pickup. Card and wallet are test options only (nothing is charged).
Stores marked **Demo listing** use well-known brand names as sample menus and are not affiliated with those brands.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | HTML5, CSS3, Bootstrap 5, vanilla JavaScript (single-page app with hash routing) |
| Backend | Node.js serverless function on Vercel (`api/index.js` → `server/api.js`), REST JSON API |
| Database | PostgreSQL (Neon on Vercel; PGlite when running locally) |
| Auth | bcryptjs password hashing, JSON Web Token in an HttpOnly, SameSite cookie |

## Folder structure

```
public/            Frontend (served as static files)
  index.html       All screens (sections shown/hidden by the router)
  style.css        Design system, layout, responsive rules, dark mode
  data.js          Images, categories, order statuses, areas
  app.js           State, API calls, rendering, cart, checkout, tracking, dashboards, router
api/index.js       Vercel serverless entry: every /api/* request
server/
  api.js           REST routes (auth, catalog, orders, favourites, addresses, promo, support, partner, admin)
  schema.js        Creates tables and seeds stores, menus, promo code and admin account
  auth.js          Password hashing and session cookies
  db.js            Postgres connection (Neon or local PGlite)
  catalog.json     Starting stores and menus
scripts/dev-server.js   Local server for development
vercel.json        Routing, security headers, output folder
```

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```
No database setup is needed locally: PGlite stores data in `.pglite/`.
Local accounts: admin `admin@mangao.local` / `admin12345`, KFC partner `kfc@mangao.local` / `partner12345`.

## Deploy (Vercel)

1. Import the repo into Vercel (Framework preset: Other).
2. Storage → add a **Neon** Postgres database to the project (sets `DATABASE_URL`).
3. Environment variables: `JWT_SECRET` (long random string), `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   optionally `DEMO_PARTNER_EMAIL`, `DEMO_PARTNER_PASSWORD`, `DEMO_PARTNER_STORE` (default `kfc`).
4. Deploy. Tables and starting data are created automatically on the first request.

## Main API routes

| Method | Route | Who |
|---|---|---|
| GET | `/api/catalog` | everyone |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | everyone |
| GET | `/api/auth/me` | everyone |
| GET/POST | `/api/orders` · GET `/api/orders/:id` · POST `/api/orders/:id/cancel`, `/rate` | customer |
| POST | `/api/orders/:id/status` | store partner, admin |
| GET/POST/DELETE | `/api/addresses`, `/api/favourites`, `/api/tickets`, `/api/messages` | customer |
| GET/PATCH/POST/DELETE | `/api/partner/store`, `/api/partner/products` | store partner |
| GET/POST | `/api/admin/overview`, `/api/admin/stores/:id`, `/api/admin/tickets/:id`, `/api/admin/messages/:userId` | admin |
