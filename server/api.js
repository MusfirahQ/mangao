// Mangao REST API. One router handles every /api/* request.
import { randomBytes, randomInt } from 'node:crypto';
import { q, one } from './db.js';
import { ensureReady } from './schema.js';
import { hashPassword, checkPassword, setSession, clearSession, readSession } from './auth.js';
import { coordsFor, validLatLng } from './geo.js';

/* ------------------------------------------------------------------ helpers */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => { throw new HttpError(400, msg); };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(?:\+92|0)3\d{9}$/;
const normPhone = (v) => String(v || '').replace(/[\s-]/g, '');
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const AREAS = ['Johar Town', 'DHA', 'Gulberg', 'Model Town', 'Bahria Town', 'Wapda Town', 'Township', 'Garden Town', 'Cantt', 'Iqbal Town'];
const PAYMENTS = ['Cash', 'Card (demo)', 'Wallet (demo)'];
const TIPS = [0, 50, 100, 150];
const FLOW = {
  delivery: ['placed', 'accepted', 'preparing', 'on_the_way', 'delivered'],
  pickup: ['placed', 'accepted', 'preparing', 'ready', 'collected'],
};
const FINAL = ['delivered', 'collected', 'cancelled', 'rejected'];

const code = (prefix, len = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[randomInt(chars.length)];
  return `${prefix}-${out}`;
};

function feeFor(store, subtotal) {
  if (store.delivery_fee === 0) return 0;
  if (store.free_delivery_over && subtotal >= store.free_delivery_over) return 0;
  return store.delivery_fee;
}

const storeView = (s) => ({
  id: s.id, name: s.name, type: s.type, kind: s.kind, tags: s.tags, rating: Number(s.rating),
  ratings: s.ratings, eta: [s.eta_min, s.eta_max], deliveryFee: s.delivery_fee,
  freeDeliveryOver: s.free_delivery_over, minOrder: s.min_order, area: s.area, address: s.address,
  color: s.color, cover: s.cover, featured: s.featured, isDemo: s.is_demo, isOpen: s.is_open, status: s.status,
  lat: s.lat, lng: s.lng,
});
const productView = (p) => ({
  id: p.id, vendorId: p.store_id, section: p.section, name: p.name, category: p.category, price: p.price,
  image: p.image, description: p.description, featured: p.featured, isNew: p.is_new, available: p.available,
});
const userView = (u, store) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, storeId: u.store_id,
  store: store ? { id: store.id, name: store.name, status: store.status } : null,
});

async function loadOrders(whereSql, params, limit = 100) {
  const orders = await q(
    `SELECT o.*, s.name AS store_name, s.area AS store_area, s.eta_max AS store_eta, s.lat AS store_lat, s.lng AS store_lng
     FROM orders o JOIN stores s ON s.id = o.store_id
     WHERE ${whereSql} ORDER BY o.created_at DESC LIMIT ${limit}`,
    params
  );
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const items = await q('SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id', [ids]);
  const events = await q('SELECT * FROM order_events WHERE order_id = ANY($1) ORDER BY id', [ids]);
  return orders.map((o) => ({
    id: o.id, checkoutId: o.checkout_id, userId: o.user_id, storeId: o.store_id, storeName: o.store_name,
    storeArea: o.store_area, storeEta: o.store_eta, mode: o.mode, status: o.status, address: o.address,
    contact: o.contact, payment: o.payment, when: o.when_text, notes: o.notes, riderNote: o.rider_note,
    subtotal: o.subtotal, deliveryFee: o.delivery_fee, discount: o.discount, tip: o.tip, total: o.total,
    promo: o.promo, rating: o.rating, createdAt: o.created_at, updatedAt: o.updated_at,
    storeLocation: o.store_lat != null ? { lat: o.store_lat, lng: o.store_lng } : null,
    destination: o.dest_lat != null ? { lat: o.dest_lat, lng: o.dest_lng, approximate: true } : null,
    // the rider's live position is only shown while the order is on its way
    rider: o.status === 'on_the_way' && o.rider_at
      ? { lat: o.rider_lat, lng: o.rider_lng, accuracy: o.rider_accuracy, at: o.rider_at } : null,
    riderToken: o.rider_token,
    items: items.filter((i) => i.order_id === o.id).map((i) => ({ productId: i.product_id, name: i.name, price: i.price, qty: i.qty })),
    events: events.filter((e) => e.order_id === o.id).map((e) => ({ status: e.status, note: e.note, at: e.created_at })),
  }));
}

// Customers never see the rider link (it lets someone send the rider's location).
const forCustomer = (o) => { const { riderToken, ...rest } = o; return rest; };
const viewFor = (user, o) => (user.role === 'admin' || (user.role === 'partner' && user.store_id === o.storeId) ? o : forCustomer(o));

async function currentUser(req) {
  const session = readSession(req);
  if (!session) return null;
  return one('SELECT * FROM users WHERE id = $1', [session.uid]);
}

function need(user, ...roles) {
  if (!user) throw new HttpError(401, 'Please log in first.');
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, 'You do not have access to this.');
}

function validateContact({ name, phone, email }, { requireContact = true } = {}) {
  const n = str(name, 60);
  const p = normPhone(phone);
  const e = str(email, 120).toLowerCase();
  if (n.length < 2) bad('Enter your name (at least 2 characters).');
  if (requireContact && !p && !e) bad('Add a mobile number or an email so you can be reached.');
  if (p && !PHONE_RE.test(p)) bad('Enter a Pakistani mobile number like 0300 1234567.');
  if (e && !EMAIL_RE.test(e)) bad('Enter a valid email like name@example.com.');
  return { name: n, phone: p, email: e };
}

/* ------------------------------------------------------------------ routes */
const routes = [];
const route = (method, path, fn) => {
  const keys = [];
  const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, fn });
};

/* ---------- health + catalog ---------- */
route('GET', '/health', async () => ({ ok: true }));

route('GET', '/catalog', async () => {
  const stores = await q(`SELECT * FROM stores WHERE status = 'active' ORDER BY featured DESC, rating DESC`);
  const products = await q(
    `SELECT p.* FROM products p JOIN stores s ON s.id = p.store_id WHERE s.status = 'active' ORDER BY p.store_id, p.sort`
  );
  return { stores: stores.map(storeView), products: products.map(productView) };
});

/* ---------- auth ---------- */
route('POST', '/auth/register', async ({ body, res }) => {
  const contact = validateContact(body, { requireContact: false });
  const email = str(body.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) bad('Enter a valid email like name@example.com.');
  const password = String(body.password || '');
  if (password.length < 8) bad('Password must be at least 8 characters.');
  if (await one('SELECT id FROM users WHERE email = $1', [email])) {
    throw new HttpError(409, 'An account with this email already exists. Try logging in.');
  }
  const user = await one(
    `INSERT INTO users (name, email, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING *`,
    [contact.name, email, contact.phone, await hashPassword(password)]
  );
  setSession(res, user);
  return { user: userView(user) };
});

route('POST', '/auth/login', async ({ body, res }) => {
  const email = str(body.email, 120).toLowerCase();
  const user = await one('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !(await checkPassword(String(body.password || ''), user.password_hash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  setSession(res, user);
  const store = user.store_id ? await one('SELECT * FROM stores WHERE id = $1', [user.store_id]) : null;
  return { user: userView(user, store) };
});

route('POST', '/auth/logout', async ({ res }) => { clearSession(res); return { ok: true }; });

route('GET', '/auth/me', async ({ user }) => {
  if (!user) return { user: null };
  const store = user.store_id ? await one('SELECT * FROM stores WHERE id = $1', [user.store_id]) : null;
  return { user: userView(user, store) };
});

/* ---------- profile ---------- */
route('PATCH', '/me', async ({ user, body }) => {
  need(user);
  const c = validateContact({ name: body.name, phone: body.phone, email: user.email }, { requireContact: false });
  const updated = await one('UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING *', [c.name, c.phone, user.id]);
  return { user: userView(updated) };
});

route('POST', '/me/password', async ({ user, body }) => {
  need(user);
  if (!(await checkPassword(String(body.current || ''), user.password_hash))) bad('Your current password is incorrect.');
  if (String(body.next || '').length < 8) bad('New password must be at least 8 characters.');
  await q('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(String(body.next)), user.id]);
  return { ok: true };
});

route('GET', '/me/export', async ({ user }) => {
  need(user);
  return {
    profile: userView(user),
    addresses: await q('SELECT label, line, area, is_default FROM addresses WHERE user_id = $1', [user.id]),
    favourites: await q('SELECT kind, item_id FROM favourites WHERE user_id = $1', [user.id]),
    orders: await loadOrders('o.user_id = $1', [user.id], 1000),
    tickets: await q('SELECT id, order_id, type, description, status, reply, created_at FROM tickets WHERE user_id = $1', [user.id]),
    messages: await q('SELECT from_role, body, created_at FROM messages WHERE user_id = $1 ORDER BY id', [user.id]),
  };
});

route('DELETE', '/me', async ({ user, body, res }) => {
  need(user);
  if (user.role === 'admin') bad('Admin accounts cannot be deleted here.');
  if (!(await checkPassword(String(body.password || ''), user.password_hash))) bad('Password is incorrect.');
  await q('DELETE FROM users WHERE id = $1', [user.id]);
  clearSession(res);
  return { ok: true };
});

/* ---------- addresses ---------- */
route('GET', '/addresses', async ({ user }) => {
  need(user);
  return { addresses: await q('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id', [user.id]) };
});

route('POST', '/addresses', async ({ user, body }) => {
  need(user);
  const line = str(body.line, 150);
  const area = str(body.area, 40);
  const label = ['Home', 'Work', 'University', 'Other'].includes(body.label) ? body.label : 'Other';
  if (line.length < 6) bad('Enter a street address with house number and street.');
  if (!AREAS.includes(area)) bad('Choose an area.');
  const count = await one('SELECT COUNT(*)::int AS n FROM addresses WHERE user_id = $1', [user.id]);
  if (count.n >= 10) bad('You can save up to 10 addresses.');
  const address = await one(
    'INSERT INTO addresses (user_id, label, line, area, is_default) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [user.id, label, line, area, count.n === 0]
  );
  return { address };
});

route('POST', '/addresses/:id/default', async ({ user, params }) => {
  need(user);
  await q('UPDATE addresses SET is_default = (id = $1) WHERE user_id = $2', [Number(params.id), user.id]);
  return { ok: true };
});

route('DELETE', '/addresses/:id', async ({ user, params }) => {
  need(user);
  const gone = await one('DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING is_default', [Number(params.id), user.id]);
  if (gone && gone.is_default) {
    await q(`UPDATE addresses SET is_default = true WHERE id = (SELECT MIN(id) FROM addresses WHERE user_id = $1)`, [user.id]);
  }
  return { ok: true };
});

/* ---------- favourites ---------- */
route('GET', '/favourites', async ({ user }) => {
  need(user);
  const rows = await q('SELECT kind, item_id FROM favourites WHERE user_id = $1', [user.id]);
  return {
    products: rows.filter((r) => r.kind === 'products').map((r) => r.item_id),
    vendors: rows.filter((r) => r.kind === 'vendors').map((r) => r.item_id),
  };
});

route('POST', '/favourites', async ({ user, body }) => {
  need(user);
  const kind = body.kind === 'vendors' ? 'vendors' : 'products';
  const id = str(body.id, 80);
  const table = kind === 'vendors' ? 'stores' : 'products';
  if (!(await one(`SELECT id FROM ${table} WHERE id = $1`, [id]))) bad('That item no longer exists.');
  const removed = await one('DELETE FROM favourites WHERE user_id = $1 AND kind = $2 AND item_id = $3 RETURNING item_id', [user.id, kind, id]);
  if (!removed) await q('INSERT INTO favourites (user_id, kind, item_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [user.id, kind, id]);
  return { on: !removed };
});

/* ---------- promo ---------- */
async function checkPromo(user, rawCode) {
  const codeText = str(rawCode, 30).toUpperCase();
  if (!codeText) bad('Enter a promo code first.');
  const promo = await one('SELECT * FROM promo_codes WHERE code = $1 AND active = true', [codeText]);
  if (!promo) bad(`“${codeText}” isn't a valid code.`);
  if (user && (await one('SELECT 1 AS x FROM promo_redemptions WHERE user_id = $1 AND code = $2', [user.id, codeText]))) {
    bad(`You've already used ${codeText} on an earlier order.`);
  }
  return promo;
}

route('POST', '/promo/check', async ({ user, body }) => {
  need(user);
  const promo = await checkPromo(user, body.code);
  return { code: promo.code, amount: promo.amount };
});

/* ---------- orders ---------- */
route('POST', '/orders', async ({ user, body }) => {
  need(user);
  const mode = body.mode === 'pickup' ? 'pickup' : 'delivery';
  const lines = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  if (!lines.length) bad('Your basket is empty.');

  const qtyById = new Map();
  for (const l of lines) {
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) bad('Each quantity must be between 1 and 99.');
    qtyById.set(String(l.productId), (qtyById.get(String(l.productId)) || 0) + qty);
  }
  const products = await q(
    `SELECT p.*, s.name AS store_name, s.is_open, s.status AS store_status FROM products p
     JOIN stores s ON s.id = p.store_id WHERE p.id = ANY($1)`,
    [[...qtyById.keys()]]
  );
  if (products.length !== qtyById.size) bad('Some items in your basket are no longer on the menu. Please remove them.');
  for (const p of products) {
    if (!p.available) bad(`${p.name} is sold out. Please remove it from your basket.`);
    if (p.store_status !== 'active' || !p.is_open) bad(`${p.store_name} is not taking orders right now.`);
  }

  const contact = validateContact(body.contact || {});
  let address = '';
  let dest = [null, null];
  if (mode === 'delivery') {
    const line = str(body.address, 200);
    const area = str(body.area, 40);
    if (line.length < 8) bad('Enter your delivery address with house number and street.');
    if (!AREAS.includes(area)) bad('Choose your area.');
    address = `${line}, ${area}, Lahore`;
    dest = coordsFor(area);
  }
  const payment = PAYMENTS.includes(body.payment) ? body.payment : 'Cash';
  const tip = mode === 'delivery' && TIPS.includes(Number(body.tip)) ? Number(body.tip) : 0;
  const when = str(body.when, 40) || 'As soon as possible';
  const notes = str(body.notes, 200);
  const riderNote = str(mode === 'delivery' ? body.riderNote : body.pickupNote, 80);

  // group by store and price everything on the server
  const storeIds = [...new Set(products.map((p) => p.store_id))];
  const stores = await q('SELECT * FROM stores WHERE id = ANY($1)', [storeIds]);
  const groups = stores.map((s) => {
    const items = products.filter((p) => p.store_id === s.id).map((p) => ({ ...p, qty: qtyById.get(p.id) }));
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return { store: s, items, subtotal, fee: mode === 'delivery' ? feeFor(s, subtotal) : 0 };
  });
  if (mode === 'delivery') {
    for (const g of groups) {
      if (g.subtotal < g.store.min_order) {
        bad(`Add Rs. ${g.store.min_order - g.subtotal} more from ${g.store.name} to reach its delivery minimum, or choose Pickup.`);
      }
    }
  }

  let promo = null;
  if (body.promo) promo = await checkPromo(user, body.promo);
  const totalSubtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  let discountLeft = promo ? Math.min(promo.amount, totalSubtotal) : 0;

  const checkoutId = code('CK', 8);
  const created = [];
  for (const [i, g] of groups.entries()) {
    const discount = Math.min(discountLeft, g.subtotal);
    discountLeft -= discount;
    const orderTip = i === 0 ? tip : 0;
    const total = Math.max(0, g.subtotal - discount + g.fee + orderTip);
    let id;
    for (let attempt = 0; attempt < 5; attempt++) {
      id = code('MG');
      const row = await one(
        `INSERT INTO orders (id, checkout_id, user_id, store_id, mode, status, address, contact, payment, when_text,
           notes, rider_note, subtotal, delivery_fee, discount, tip, total, promo, dest_lat, dest_lng)
         VALUES ($1,$2,$3,$4,$5,'placed',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [id, checkoutId, user.id, g.store.id, mode, address, JSON.stringify(contact), payment, when, notes, riderNote,
          g.subtotal, g.fee, discount, orderTip, total, discount ? promo.code : null, dest[0], dest[1]]
      );
      if (row) break;
      id = null;
    }
    if (!id) throw new HttpError(500, 'Could not create the order. Please try again.');
    const vals = [];
    const params = [id];
    g.items.forEach((it, k) => {
      const b = 1 + k * 4;
      vals.push(`($1, $${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`);
      params.push(it.id, it.name, it.price, it.qty);
    });
    await q(`INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES ${vals.join(',')}`, params);
    await q(`INSERT INTO order_events (order_id, status) VALUES ($1, 'placed')`, [id]);
    created.push(id);
  }
  if (promo) {
    await q('INSERT INTO promo_redemptions (user_id, code, order_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [user.id, promo.code, created[0]]);
  }
  // remember a new delivery address for next time
  if (mode === 'delivery' && body.saveAddress) {
    const exists = await one('SELECT id FROM addresses WHERE user_id = $1 AND line = $2 AND area = $3', [user.id, str(body.address, 150), str(body.area, 40)]);
    if (!exists) {
      const n = await one('SELECT COUNT(*)::int AS n FROM addresses WHERE user_id = $1', [user.id]);
      if (n.n < 10) await q('INSERT INTO addresses (user_id, label, line, area, is_default) VALUES ($1,$2,$3,$4,$5)', [user.id, 'Home', str(body.address, 150), str(body.area, 40), n.n === 0]);
    }
  }
  if (!user.phone && contact.phone) await q('UPDATE users SET phone = $1 WHERE id = $2', [contact.phone, user.id]);

  return { checkoutId, orders: (await loadOrders('o.checkout_id = $1', [checkoutId])).map(forCustomer) };
});

route('GET', '/orders', async ({ user }) => {
  need(user);
  return { orders: (await loadOrders('o.user_id = $1', [user.id])).map(forCustomer) };
});

async function orderFor(user, id) {
  const [order] = await loadOrders('o.id = $1', [id]);
  if (!order) throw new HttpError(404, 'Order not found.');
  const allowed = order.userId === user.id || user.role === 'admin' || (user.role === 'partner' && user.store_id === order.storeId);
  if (!allowed) throw new HttpError(404, 'Order not found.');
  return order;
}

route('GET', '/orders/:id', async ({ user, params }) => {
  need(user);
  return { order: viewFor(user, await orderFor(user, params.id)) };
});

route('POST', '/orders/:id/cancel', async ({ user, params }) => {
  need(user);
  const order = await orderFor(user, params.id);
  if (order.userId !== user.id) throw new HttpError(403, 'Only the customer can cancel this order.');
  if (order.status !== 'placed') bad('This order has already been accepted and can no longer be cancelled. Contact support for help.');
  await q(`UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1`, [order.id]);
  await q(`INSERT INTO order_events (order_id, status, note) VALUES ($1, 'cancelled', 'Cancelled by customer')`, [order.id]);
  if (order.promo) {
    const still = await one(`SELECT 1 AS x FROM orders WHERE user_id = $1 AND promo = $2 AND status <> 'cancelled'`, [user.id, order.promo]);
    if (!still) await q('DELETE FROM promo_redemptions WHERE user_id = $1 AND code = $2', [user.id, order.promo]);
  }
  return { order: forCustomer(await orderFor(user, order.id)) };
});

route('POST', '/orders/:id/rate', async ({ user, params, body }) => {
  need(user);
  const order = await orderFor(user, params.id);
  if (order.userId !== user.id) throw new HttpError(403, 'Only the customer can rate this order.');
  if (!['delivered', 'collected'].includes(order.status)) bad('You can rate an order after it is completed.');
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) bad('Choose 1 to 5 stars.');
  if (!order.rating) {
    await q(`UPDATE stores SET rating = ROUND(((rating * ratings + $1) / (ratings + 1))::numeric, 1), ratings = ratings + 1 WHERE id = $2`, [stars, order.storeId]);
  }
  await q('UPDATE orders SET rating = $1 WHERE id = $2', [stars, order.id]);
  return { order: forCustomer(await orderFor(user, order.id)) };
});

route('POST', '/orders/:id/status', async ({ user, params, body }) => {
  need(user, 'partner', 'admin');
  const order = await orderFor(user, params.id);
  const next = String(body.status || '');
  const flow = FLOW[order.mode];
  const idx = flow.indexOf(order.status);
  const ok =
    (idx >= 0 && flow[idx + 1] === next) ||
    (next === 'rejected' && order.status === 'placed') ||
    (next === 'cancelled' && user.role === 'admin' && !FINAL.includes(order.status));
  if (!ok) bad(`An order that is “${order.status}” can't be moved to “${next}”.`);
  await q('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [next, order.id]);
  if (next === 'on_the_way' && !order.riderToken) {
    await q('UPDATE orders SET rider_token = $1 WHERE id = $2', [randomBytes(18).toString('base64url'), order.id]);
  }
  await q('INSERT INTO order_events (order_id, status, note) VALUES ($1,$2,$3)', [order.id, next, str(body.note, 140)]);
  return { order: await orderFor(user, order.id) };
});

/* ---------- rider (live location) ----------
   The store gets a secret rider link for each order that is out for delivery.
   Whoever opens it (the rider) can share their phone's GPS position and mark the order delivered.
   No login is needed, the long random token in the link is the permission. */
async function riderOrder(token) {
  const t = String(token || '');
  if (t.length < 20) throw new HttpError(404, 'This rider link is not valid.');
  const [order] = await loadOrders('o.rider_token = $1', [t]);
  if (!order) throw new HttpError(404, 'This rider link is not valid.');
  return order;
}
const riderView = (o) => ({
  id: o.id, status: o.status, storeName: o.storeName, storeArea: o.storeArea, address: o.address,
  contact: { name: o.contact.name, phone: o.contact.phone }, items: o.items, total: o.total, payment: o.payment,
  notes: o.notes, riderNote: o.riderNote, storeLocation: o.storeLocation, destination: o.destination, rider: o.rider,
});

route('GET', '/rider/:token', async ({ params }) => ({ order: riderView(await riderOrder(params.token)) }));

route('POST', '/rider/:token/location', async ({ params, body }) => {
  const order = await riderOrder(params.token);
  if (order.status !== 'on_the_way') bad('This order is no longer out for delivery, so location sharing has stopped.');
  const lat = Number(body.lat), lng = Number(body.lng);
  const accuracy = Math.max(0, Math.min(100000, Number(body.accuracy) || 0));
  if (!validLatLng(lat, lng)) bad('Invalid location.');
  await q('UPDATE orders SET rider_lat = $1, rider_lng = $2, rider_accuracy = $3, rider_at = now() WHERE id = $4', [lat, lng, accuracy, order.id]);
  return { ok: true };
});

route('POST', '/rider/:token/delivered', async ({ params }) => {
  const order = await riderOrder(params.token);
  if (order.status !== 'on_the_way') bad('This order is not out for delivery.');
  await q(`UPDATE orders SET status = 'delivered', updated_at = now() WHERE id = $1`, [order.id]);
  await q(`INSERT INTO order_events (order_id, status, note) VALUES ($1, 'delivered', 'Marked delivered by rider')`, [order.id]);
  return { order: riderView((await loadOrders('o.id = $1', [order.id]))[0]) };
});

/* ---------- partners (restaurant / shop owners) ---------- */
route('POST', '/partner/apply', async ({ user, body }) => {
  need(user);
  if (user.role !== 'customer') bad('This account is already linked to a store or is an admin.');
  const name = str(body.name, 60);
  const type = body.type === 'shop' ? 'shop' : 'restaurant';
  const kind = str(body.kind, 40);
  const area = str(body.area, 40);
  const address = str(body.address, 200);
  const phone = normPhone(body.phone);
  if (name.length < 2) bad('Enter your restaurant or shop name.');
  if (kind.length < 2) bad('Enter what you sell, e.g. Burgers or Supermarket.');
  if (!AREAS.includes(area)) bad('Choose your area.');
  if (address.length < 8) bad('Enter the full address of your restaurant or shop.');
  if (!PHONE_RE.test(phone)) bad('Enter a contact number like 0300 1234567.');
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'store';
  if (await one('SELECT id FROM stores WHERE id = $1', [id])) id = `${id}-${randomBytes(2).toString('hex')}`;
  const colors = ['#C8102E', '#0B7A3E', '#004E9F', '#6B2D1F', '#7A1F1F', '#1F1F1F', '#D4145A'];
  await q(
    `INSERT INTO stores (id, name, type, kind, tags, rating, ratings, area, address, phone, color, cover, status, is_demo, lat, lng)
     VALUES ($1,$2,$3,$4,$5,0,0,$6,$7,$8,$9,$10,'pending',false,$11,$12)`,
    [id, name, type, kind, JSON.stringify([kind]), area, address, phone, colors[randomInt(colors.length)], type === 'shop' ? 'supermarket' : 'burger',
      ...coordsFor(area)]
  );
  const updated = await one(`UPDATE users SET role = 'partner', store_id = $1 WHERE id = $2 RETURNING *`, [id, user.id]);
  const store = await one('SELECT * FROM stores WHERE id = $1', [id]);
  return { user: userView(updated, store) };
});

async function myStore(user) {
  need(user, 'partner');
  const store = await one('SELECT * FROM stores WHERE id = $1', [user.store_id]);
  if (!store) throw new HttpError(404, 'Your store was not found.');
  return store;
}

route('GET', '/partner/store', async ({ user }) => {
  const store = await myStore(user);
  const products = await q('SELECT * FROM products WHERE store_id = $1 ORDER BY sort, id', [store.id]);
  const orders = await loadOrders('o.store_id = $1', [store.id], 200);
  return { store: storeView(store), products: products.map(productView), orders };
});

route('PATCH', '/partner/store', async ({ user, body }) => {
  const store = await myStore(user);
  const isOpen = body.isOpen === undefined ? store.is_open : Boolean(body.isOpen);
  const etaMin = Math.max(5, Math.min(180, Number(body.etaMin ?? store.eta_min) || store.eta_min));
  const etaMax = Math.max(etaMin, Math.min(240, Number(body.etaMax ?? store.eta_max) || store.eta_max));
  const fee = Math.max(0, Math.min(1000, Number(body.deliveryFee ?? store.delivery_fee) || 0));
  const minOrder = Math.max(0, Math.min(10000, Number(body.minOrder ?? store.min_order) || 0));
  const updated = await one(
    'UPDATE stores SET is_open = $1, eta_min = $2, eta_max = $3, delivery_fee = $4, min_order = $5 WHERE id = $6 RETURNING *',
    [isOpen, etaMin, etaMax, fee, minOrder, store.id]
  );
  return { store: storeView(updated) };
});

route('POST', '/partner/products', async ({ user, body }) => {
  const store = await myStore(user);
  const name = str(body.name, 80);
  const section = str(body.section, 40) || 'Menu';
  const price = Number(body.price);
  const category = ['food', 'groceries', 'essentials'].includes(body.category) ? body.category : 'food';
  if (name.length < 2) bad('Enter the item name.');
  if (!Number.isInteger(price) || price < 1 || price > 100000) bad('Enter a price in rupees (whole number).');
  const count = await one('SELECT COUNT(*)::int AS n FROM products WHERE store_id = $1', [store.id]);
  if (count.n >= 300) bad('A store can have up to 300 items.');
  const id = `${store.id}-${randomBytes(3).toString('hex')}`;
  const image = str(body.image, 30) || (category === 'food' ? 'burger' : category === 'groceries' ? 'vegetables' : 'soap');
  const p = await one(
    `INSERT INTO products (id, store_id, section, name, category, price, image, description, sort)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id, store.id, section, name, category, price, image, str(body.description, 200), count.n + 1]
  );
  return { product: productView(p) };
});

route('PATCH', '/partner/products/:id', async ({ user, params, body }) => {
  const store = await myStore(user);
  const p = await one('SELECT * FROM products WHERE id = $1 AND store_id = $2', [params.id, store.id]);
  if (!p) throw new HttpError(404, 'Item not found.');
  const price = body.price === undefined ? p.price : Number(body.price);
  if (!Number.isInteger(price) || price < 1 || price > 100000) bad('Enter a price in rupees (whole number).');
  const available = body.available === undefined ? p.available : Boolean(body.available);
  const updated = await one('UPDATE products SET price = $1, available = $2 WHERE id = $3 RETURNING *', [price, available, p.id]);
  return { product: productView(updated) };
});

route('DELETE', '/partner/products/:id', async ({ user, params }) => {
  const store = await myStore(user);
  await q('DELETE FROM products WHERE id = $1 AND store_id = $2', [params.id, store.id]);
  return { ok: true };
});

/* ---------- support ---------- */
route('POST', '/tickets', async ({ user, body }) => {
  need(user);
  const types = ['Order or checkout question', 'Missing or incorrect item', 'Delivery/pickup question', 'Payment question', 'Other'];
  if (!types.includes(body.type)) bad('Choose what the issue is about.');
  const description = str(body.description, 1000);
  if (description.length < 15) bad('Describe the problem in at least 15 characters.');
  let orderId = str(body.orderId, 20) || null;
  if (orderId && !(await one('SELECT id FROM orders WHERE id = $1 AND user_id = $2', [orderId, user.id]))) orderId = null;
  const id = code('CASE', 6);
  await q('INSERT INTO tickets (id, user_id, order_id, type, description) VALUES ($1,$2,$3,$4,$5)', [id, user.id, orderId, body.type, description]);
  return { ticket: await one('SELECT * FROM tickets WHERE id = $1', [id]) };
});

route('GET', '/tickets', async ({ user }) => {
  need(user);
  return { tickets: await q('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC', [user.id]) };
});

route('GET', '/messages', async ({ user }) => {
  need(user);
  return { messages: await q('SELECT id, from_role, body, created_at FROM messages WHERE user_id = $1 ORDER BY id', [user.id]) };
});

route('POST', '/messages', async ({ user, body }) => {
  need(user);
  const text = str(body.body, 1000);
  if (!text) bad('Type a message first.');
  const before = await one('SELECT COUNT(*)::int AS n FROM messages WHERE user_id = $1', [user.id]);
  await q(`INSERT INTO messages (user_id, from_role, body) VALUES ($1, 'user', $2)`, [user.id, text]);
  if (before.n === 0) {
    await q(
      `INSERT INTO messages (user_id, from_role, body) VALUES ($1, 'support', $2)`,
      [user.id, 'Thanks for your message! A member of the Mangao team will reply here. You can close this page; your conversation is saved.']
    );
  }
  return { messages: await q('SELECT id, from_role, body, created_at FROM messages WHERE user_id = $1 ORDER BY id', [user.id]) };
});

/* ---------- admin ---------- */
route('GET', '/admin/overview', async ({ user }) => {
  need(user, 'admin');
  const stats = await one(`SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM orders) AS orders,
      (SELECT COUNT(*)::int FROM orders WHERE status NOT IN ('delivered','collected','cancelled','rejected')) AS active_orders,
      (SELECT COALESCE(SUM(total),0)::int FROM orders WHERE status IN ('delivered','collected')) AS revenue,
      (SELECT COUNT(*)::int FROM tickets WHERE status = 'open') AS open_tickets,
      (SELECT COUNT(*)::int FROM stores WHERE status = 'pending') AS pending_stores`);
  const stores = await q(`SELECT s.*, (SELECT email FROM users u WHERE u.store_id = s.id AND u.role = 'partner' LIMIT 1) AS owner_email
                          FROM stores s ORDER BY (s.status = 'pending') DESC, s.name`);
  const users = await q('SELECT id, name, email, phone, role, store_id, created_at FROM users ORDER BY created_at DESC LIMIT 100');
  const tickets = await q(`SELECT t.*, u.name AS user_name, u.email AS user_email FROM tickets t JOIN users u ON u.id = t.user_id
                           ORDER BY (t.status = 'open') DESC, t.created_at DESC LIMIT 100`);
  const conversations = await q(`SELECT u.id AS user_id, u.name, u.email, COUNT(m.id)::int AS count, MAX(m.created_at) AS last_at,
      (SELECT from_role FROM messages m2 WHERE m2.user_id = u.id ORDER BY m2.id DESC LIMIT 1) AS last_from
      FROM messages m JOIN users u ON u.id = m.user_id GROUP BY u.id, u.name, u.email ORDER BY last_at DESC LIMIT 100`);
  return {
    stats,
    orders: await loadOrders('true', [], 100),
    stores: stores.map((s) => ({ ...storeView(s), ownerEmail: s.owner_email })),
    users, tickets, conversations,
  };
});

route('POST', '/admin/stores/:id', async ({ user, params, body }) => {
  need(user, 'admin');
  const status = ['active', 'pending', 'suspended'].includes(body.status) ? body.status : null;
  if (!status) bad('Unknown status.');
  const s = await one('UPDATE stores SET status = $1 WHERE id = $2 RETURNING *', [status, params.id]);
  if (!s) throw new HttpError(404, 'Store not found.');
  return { store: storeView(s) };
});

route('POST', '/admin/stores/:id/owner', async ({ user, params, body }) => {
  need(user, 'admin');
  const email = str(body.email, 120).toLowerCase();
  const target = await one('SELECT * FROM users WHERE email = $1', [email]);
  if (!target) bad('No account with that email. Ask the owner to sign up first.');
  if (target.role === 'admin') bad('Admins cannot be store owners.');
  if (!(await one('SELECT id FROM stores WHERE id = $1', [params.id]))) throw new HttpError(404, 'Store not found.');
  await q(`UPDATE users SET role = 'partner', store_id = $1 WHERE id = $2`, [params.id, target.id]);
  return { ok: true };
});

route('POST', '/admin/tickets/:id', async ({ user, params, body }) => {
  need(user, 'admin');
  const status = body.status === 'resolved' ? 'resolved' : 'open';
  const t = await one('UPDATE tickets SET status = $1, reply = $2 WHERE id = $3 RETURNING *', [status, str(body.reply, 1000), params.id]);
  if (!t) throw new HttpError(404, 'Ticket not found.');
  return { ticket: t };
});

route('GET', '/admin/messages/:userId', async ({ user, params }) => {
  need(user, 'admin');
  return { messages: await q('SELECT id, from_role, body, created_at FROM messages WHERE user_id = $1 ORDER BY id', [Number(params.userId)]) };
});

route('POST', '/admin/messages/:userId', async ({ user, params, body }) => {
  need(user, 'admin');
  const text = str(body.body, 1000);
  if (!text) bad('Type a reply first.');
  if (!(await one('SELECT id FROM users WHERE id = $1', [Number(params.userId)]))) throw new HttpError(404, 'User not found.');
  await q(`INSERT INTO messages (user_id, from_role, body) VALUES ($1, 'support', $2)`, [Number(params.userId), text]);
  return { messages: await q('SELECT id, from_role, body, created_at FROM messages WHERE user_id = $1 ORDER BY id', [Number(params.userId)]) };
});

/* ------------------------------------------------------------------ handler */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };
  try {
    const url = new URL(req.url, 'http://local');
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const method = req.method.toUpperCase();

    // Basic CSRF protection: changes must be sent as JSON (browsers can't do that cross-site without permission).
    if (method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json')) {
      return send(415, { error: 'Requests must be JSON.' });
    }

    const match = routes.map((r) => ({ r, m: r.method === method && path.match(r.re) })).find((x) => x.m);
    if (!match) return send(404, { error: 'Not found.' });

    await ensureReady();
    const params = {};
    match.r.keys.forEach((k, i) => { params[k] = decodeURIComponent(match.m[i + 1]); });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const user = await currentUser(req);
    const data = await match.r.fn({ req, res, body: body || {}, params, query: Object.fromEntries(url.searchParams), user });
    return send(200, data);
  } catch (err) {
    if (err instanceof HttpError) return send(err.status, { error: err.message });
    console.error(err);
    return send(500, { error: 'Something went wrong on our side. Please try again.' });
  }
}
