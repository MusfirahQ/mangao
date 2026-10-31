// Creates tables (if missing), seeds the catalog and the admin account.
// Runs once per server start; every statement is safe to run again.
import { readFileSync } from 'node:fs';
import { q, one } from './db.js';
import { hashPassword } from './auth.js';

const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    store_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    kind TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]',
    rating REAL NOT NULL DEFAULT 0,
    ratings INT NOT NULL DEFAULT 0,
    eta_min INT NOT NULL DEFAULT 30,
    eta_max INT NOT NULL DEFAULT 45,
    delivery_fee INT NOT NULL DEFAULT 99,
    free_delivery_over INT NOT NULL DEFAULT 0,
    min_order INT NOT NULL DEFAULT 0,
    area TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#F5A900',
    cover TEXT NOT NULL DEFAULT 'burger',
    featured BOOLEAN NOT NULL DEFAULT false,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    is_open BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INT NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    featured BOOLEAN NOT NULL DEFAULT false,
    is_new BOOLEAN NOT NULL DEFAULT false,
    available BOOLEAN NOT NULL DEFAULT true,
    sort INT NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    line TEXT NOT NULL,
    area TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS favourites (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    item_id TEXT NOT NULL,
    PRIMARY KEY (user_id, kind, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    amount INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    description TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS promo_redemptions (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    order_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    checkout_id TEXT NOT NULL,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES stores(id),
    mode TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'placed',
    address TEXT NOT NULL DEFAULT '',
    contact JSONB NOT NULL,
    payment TEXT NOT NULL,
    when_text TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    rider_note TEXT NOT NULL DEFAULT '',
    subtotal INT NOT NULL,
    delivery_fee INT NOT NULL,
    discount INT NOT NULL DEFAULT 0,
    tip INT NOT NULL DEFAULT 0,
    total INT NOT NULL,
    promo TEXT,
    rating INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price INT NOT NULL,
    qty INT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    reply TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_role TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id)`,
  `CREATE INDEX IF NOT EXISTS orders_store_idx ON orders(store_id)`,
  `CREATE INDEX IF NOT EXISTS items_order_idx ON order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS events_order_idx ON order_events(order_id)`,
  `CREATE INDEX IF NOT EXISTS messages_user_idx ON messages(user_id)`,
];

async function seedCatalog() {
  const existing = await one('SELECT COUNT(*)::int AS n FROM stores');
  if (existing && existing.n > 0) return;

  for (const s of catalog.stores) {
    await q(
      `INSERT INTO stores (id, name, type, kind, tags, rating, ratings, eta_min, eta_max, delivery_fee,
         free_delivery_over, min_order, area, color, cover, featured, is_demo, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,'active')
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.type, s.kind, JSON.stringify(s.tags), s.rating, s.ratings, s.eta[0], s.eta[1],
        s.deliveryFee, s.freeDeliveryOver, s.minOrder, s.area, s.color, s.cover, s.featured]
    );
  }
  // one multi-row insert for all products (sort keeps the menu order)
  const values = [];
  const params = [];
  catalog.products.forEach((p, i) => {
    const b = i * 12;
    const marks = Array.from({ length: 12 }, (_, k) => `$${b + k + 1}`);
    values.push(`(${marks.join(',')})`);
    params.push(p.id, p.vendorId, p.section, p.name, p.category, p.price, p.image, p.description,
      p.featured, p.isNew, p.available, i);
  });
  await q(
    `INSERT INTO products (id, store_id, section, name, category, price, image, description, featured, is_new, available, sort)
     VALUES ${values.join(',')} ON CONFLICT (id) DO NOTHING`,
    params
  );
}

async function seedAccounts() {
  await q(
    `INSERT INTO promo_codes (code, amount, active, description)
     VALUES ('MANGO150', 150, true, 'Rs. 150 off, once per customer') ON CONFLICT (code) DO NOTHING`
  );

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (adminEmail && adminPassword) {
    const existing = await one('SELECT id, role FROM users WHERE email = $1', [adminEmail]);
    if (!existing) {
      await q(
        `INSERT INTO users (name, email, password_hash, role) VALUES ('Mangao Admin', $1, $2, 'admin')
         ON CONFLICT (email) DO NOTHING`,
        [adminEmail, await hashPassword(adminPassword)]
      );
    } else if (existing.role !== 'admin') {
      await q(`UPDATE users SET role = 'admin' WHERE id = $1`, [existing.id]);
    }
  }

  // Optional demo partner account so the store dashboard can be shown (KFC demo listing).
  const demoEmail = (process.env.DEMO_PARTNER_EMAIL || '').trim().toLowerCase();
  const demoPassword = process.env.DEMO_PARTNER_PASSWORD || '';
  const demoStore = process.env.DEMO_PARTNER_STORE || 'kfc';
  if (demoEmail && demoPassword) {
    await q(
      `INSERT INTO users (name, email, password_hash, role, store_id) VALUES ('Demo Partner', $1, $2, 'partner', $3)
       ON CONFLICT (email) DO NOTHING`,
      [demoEmail, await hashPassword(demoPassword), demoStore]
    );
  }
}

let ready = null;
export function ensureReady() {
  if (!ready) {
    ready = (async () => {
      for (const sql of TABLES) await q(sql);
      await seedCatalog();
      await seedAccounts();
    })().catch((err) => {
      ready = null; // retry on the next request
      throw err;
    });
  }
  return ready;
}
