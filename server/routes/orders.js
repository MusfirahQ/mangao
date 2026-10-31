// Ordering: promo check, checkout, my orders, tracking, cancel, rate, and status changes by stores/admins.
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import Promo from '../models/Promo.js';
import { requireAuth } from '../middleware/auth.js';
import { coordsFor } from '../utils/geo.js';
import {
  asyncHandler, bad, HttpError, str, code, feeFor, validateContact, AREAS, PAYMENTS, TIPS, FLOW, FINAL,
} from '../utils/helpers.js';

const router = Router();
router.use(requireAuth());

/** Checks a promo code for this user. Returns the promo or throws a 400 error. */
async function checkPromo(user, raw) {
  const codeText = str(raw, 30).toUpperCase();
  if (!codeText) bad('Enter a promo code first.');
  const promo = await Promo.findOne({ _id: codeText, active: true });
  if (!promo) bad(`“${codeText}” isn't a valid code.`);
  if (user.usedPromos.includes(codeText)) bad(`You've already used ${codeText} on an earlier order.`);
  return promo;
}

/** Can this user see this order? Customer who placed it, the store that owns it, or an admin. */
function canSee(user, order) {
  return order.user.equals(user._id) || user.role === 'admin' || (user.role === 'partner' && user.store === order.store);
}
const isStaff = (user, order) => user.role === 'admin' || (user.role === 'partner' && user.store === order.store);
const view = (user, order) => order.toPublic({ withRiderToken: isStaff(user, order) });

async function findOrder(user, id) {
  const order = await Order.findById(id);
  if (!order || !canSee(user, order)) throw new HttpError(404, 'Order not found.');
  return order;
}

// POST /api/orders/promo  { code }
router.post('/promo', asyncHandler(async (req, res) => {
  const promo = await checkPromo(req.user, req.body.code);
  res.json({ code: promo._id, amount: promo.amount });
}));

// POST /api/orders  — checkout. All prices, fees and discounts are worked out here on the server.
router.post('/', asyncHandler(async (req, res) => {
  const user = req.user;
  const body = req.body;
  const mode = body.mode === 'pickup' ? 'pickup' : 'delivery';
  const lines = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  if (!lines.length) bad('Your basket is empty.');

  const qtyById = new Map();
  for (const l of lines) {
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) bad('Each quantity must be between 1 and 99.');
    qtyById.set(String(l.productId), (qtyById.get(String(l.productId)) || 0) + qty);
  }
  const products = await Product.find({ _id: { $in: [...qtyById.keys()] } });
  if (products.length !== qtyById.size) bad('Some items in your basket are no longer on the menu. Please remove them.');
  const stores = await Store.find({ _id: { $in: [...new Set(products.map((p) => p.store))] } });
  const storeById = new Map(stores.map((s) => [s._id, s]));
  for (const p of products) {
    const s = storeById.get(p.store);
    if (!p.available) bad(`${p.name} is sold out. Please remove it from your basket.`);
    if (!s || s.status !== 'active' || !s.isOpen) bad(`${s ? s.name : 'A store'} is not taking orders right now.`);
  }

  const contact = validateContact(body.contact || {});
  let address = '';
  let destination;
  if (mode === 'delivery') {
    const line = str(body.address, 200);
    const area = str(body.area, 40);
    if (line.length < 8) bad('Enter your delivery address with house number and street.');
    if (!AREAS.includes(area)) bad('Choose your area.');
    address = `${line}, ${area}, Lahore`;
    const [lat, lng] = coordsFor(area);
    destination = { lat, lng };
  }
  const payment = PAYMENTS.includes(body.payment) ? body.payment : 'Cash';
  const tip = mode === 'delivery' && TIPS.includes(Number(body.tip)) ? Number(body.tip) : 0;

  // one order per store
  const groups = stores.map((s) => {
    const items = products.filter((p) => p.store === s._id).map((p) => ({ product: p._id, name: p.name, price: p.price, qty: qtyById.get(p._id) }));
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return { store: s, items, subtotal, fee: mode === 'delivery' ? feeFor(s, subtotal) : 0 };
  });
  if (mode === 'delivery') {
    for (const g of groups) {
      if (g.subtotal < g.store.minOrder) bad(`Add Rs. ${g.store.minOrder - g.subtotal} more from ${g.store.name} to reach its delivery minimum, or choose Pickup.`);
    }
  }
  const promo = body.promo ? await checkPromo(user, body.promo) : null;
  let discountLeft = promo ? Math.min(promo.amount, groups.reduce((s, g) => s + g.subtotal, 0)) : 0;

  const checkoutId = code('CK', 8);
  const created = [];
  for (const [i, g] of groups.entries()) {
    const discount = Math.min(discountLeft, g.subtotal);
    discountLeft -= discount;
    const orderTip = i === 0 ? tip : 0;
    const doc = {
      checkoutId, user: user._id, store: g.store._id, storeName: g.store.name, storeArea: g.store.area,
      storeEta: g.store.eta.max, storeLocation: g.store.location, mode, address, destination, contact, payment,
      when: str(body.when, 40) || 'As soon as possible', notes: str(body.notes, 200),
      riderNote: str(mode === 'delivery' ? body.riderNote : body.pickupNote, 80),
      items: g.items, subtotal: g.subtotal, deliveryFee: g.fee, discount, tip: orderTip,
      total: Math.max(0, g.subtotal - discount + g.fee + orderTip), promo: discount ? promo._id : null,
      events: [{ status: 'placed' }],
    };
    // retry if the random order number is already taken (very unlikely)
    for (let attempt = 0; ; attempt++) {
      try {
        created.push(await Order.create({ _id: code('MG'), ...doc }));
        break;
      } catch (err) {
        if (err.code !== 11000 || attempt >= 4) throw err;
      }
    }
  }

  if (promo) user.usedPromos.addToSet(promo._id);
  if (mode === 'delivery' && body.saveAddress) {
    const line = str(body.address, 150);
    const area = str(body.area, 40);
    if (!user.addresses.some((a) => a.line === line && a.area === area) && user.addresses.length < 10) {
      user.addresses.push({ label: 'Home', line, area, isDefault: user.addresses.length === 0 });
    }
  }
  if (!user.phone && contact.phone) user.phone = contact.phone;
  await user.save();

  res.status(201).json({ checkoutId, orders: created.map((o) => o.toPublic()) });
}));

// GET /api/orders  — my orders
router.get('/', asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ orders: orders.map((o) => o.toPublic()) });
}));

// GET /api/orders/:id
router.get('/:id', asyncHandler(async (req, res) => {
  res.json({ order: view(req.user, await findOrder(req.user, req.params.id)) });
}));

// POST /api/orders/:id/cancel  — customer cancels before the store accepts
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const order = await findOrder(req.user, req.params.id);
  if (!order.user.equals(req.user._id)) throw new HttpError(403, 'Only the customer can cancel this order.');
  if (order.status !== 'placed') bad('This order has already been accepted and can no longer be cancelled. Contact support for help.');
  order.status = 'cancelled';
  order.events.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await order.save();
  // give the promo code back if this was the only order that used it
  if (order.promo && !(await Order.exists({ user: req.user._id, promo: order.promo, status: { $ne: 'cancelled' } }))) {
    req.user.usedPromos.pull(order.promo);
    await req.user.save();
  }
  res.json({ order: order.toPublic() });
}));

// POST /api/orders/:id/rate  { stars }
router.post('/:id/rate', asyncHandler(async (req, res) => {
  const order = await findOrder(req.user, req.params.id);
  if (!order.user.equals(req.user._id)) throw new HttpError(403, 'Only the customer can rate this order.');
  if (!['delivered', 'collected'].includes(order.status)) bad('You can rate an order after it is completed.');
  const stars = Number(req.body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) bad('Choose 1 to 5 stars.');
  if (!order.rating) {
    const store = await Store.findById(order.store);
    if (store) {
      store.rating = Math.round(((store.rating * store.ratings + stars) / (store.ratings + 1)) * 10) / 10;
      store.ratings += 1;
      await store.save();
    }
  }
  order.rating = stars;
  await order.save();
  res.json({ order: order.toPublic() });
}));

// POST /api/orders/:id/status  { status, note }  — store or admin moves the order to its next step
router.post('/:id/status', requireAuth('partner', 'admin'), asyncHandler(async (req, res) => {
  const order = await findOrder(req.user, req.params.id);
  if (!isStaff(req.user, order)) throw new HttpError(403, 'You do not manage this order.');
  const next = String(req.body.status || '');
  const flow = FLOW[order.mode];
  const idx = flow.indexOf(order.status);
  const allowed = (idx >= 0 && flow[idx + 1] === next)
    || (next === 'rejected' && order.status === 'placed')
    || (next === 'cancelled' && req.user.role === 'admin' && !FINAL.includes(order.status));
  if (!allowed) bad(`An order that is “${order.status}” can't be moved to “${next}”.`);
  order.status = next;
  order.events.push({ status: next, note: str(req.body.note, 140) });
  // when it goes out for delivery, create the secret rider link
  if (next === 'on_the_way' && !order.rider?.token) order.rider = { token: randomBytes(18).toString('base64url') };
  await order.save();
  res.json({ order: view(req.user, order) });
}));

export default router;
