# Mangao — MERN food, groceries & essentials ordering app

**Stack:** MongoDB (Mongoose) · Express · React 18 (Vite) · Node.js 22

Customers order from restaurants and shops in Lahore, store owners manage orders and menus,
an admin approves stores and answers support, and riders share live GPS that the customer sees on a map.

## Folder structure
```
client/            React frontend (Vite)
  src/main.jsx       app entry: providers + router
  src/App.jsx        all page routes
  src/context/       global state: Auth, Cart, Catalog, Orders, Settings, UI
  src/pages/         one file per page (Home, StorePage, Checkout, Track, Partner, Admin, Rider …)
  src/components/    reusable pieces (Layout, StoreCard, ProductCard, Basket, MapView …)
  src/lib/           api() helper, formatting, pricing, small hooks
server/            Express backend
  app.js             express app: middleware + routers
  index.js           local server (also serves the built React app)
  db.js / seed.js    MongoDB connection, first-run sample data
  models/            Mongoose schemas: User, Store, Product, Order, Promo, Ticket, Message
  routes/            REST API: auth, catalog, me, orders, rider, partner, support, admin
  middleware/auth.js JWT cookie login + role checks
api/index.js       Vercel serverless entry (exports the Express app)
```

## Run locally
1. Install Node 22 and either run MongoDB locally or create a free MongoDB Atlas cluster.
2. `npm install`
3. Create `.env` (or export variables):
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/mangao
   JWT_SECRET=any-long-random-text
   ```
4. `npm run dev` → React on http://localhost:5173, API on http://localhost:5000
   (or `npm run build && npm start` → everything on http://localhost:5000)

Local default logins (when ADMIN_/DEMO_PARTNER_ env vars are not set):
admin `admin@mangao.local / admin12345`, KFC owner `kfc@mangao.local / partner12345`.

## Main API
| Method | Path | What |
|---|---|---|
| POST | /api/auth/register, /api/auth/login, /api/auth/logout | accounts |
| GET | /api/catalog | stores + products |
| POST | /api/orders | checkout (prices checked on the server) |
| GET | /api/orders, /api/orders/:id | my orders / tracking |
| POST | /api/orders/:id/status | store/admin moves order forward |
| POST | /api/rider/:token/location | rider phone sends GPS |
| GET/PATCH | /api/partner/store, /api/partner/products | store dashboard |
| GET | /api/admin/overview | admin panel |
