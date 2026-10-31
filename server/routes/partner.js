// Store owners: apply to sell, manage their store, menu and orders.
import { Router } from 'express';
import { randomBytes, randomInt } from 'node:crypto';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { coordsFor } from '../utils/geo.js';
import { asyncHandler, bad, HttpError, str, normPhone, PHONE_RE, AREAS } from '../utils/helpers.js';

const router = Router();

// POST /api/partner/apply  — a customer applies to sell on Mangao (admin approves later)
router.post('/apply', requireAuth(), asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== 'customer') bad('This account is already linked to a store or is an admin.');
  const name = str(req.body.name, 60);
  const type = req.body.type === 'shop' ? 'shop' : 'restaurant';
  const kind = str(req.body.kind, 40);
  const area = str(req.body.area, 40);
  const address = str(req.body.address, 200);
  const phone = normPhone(req.body.phone);
  if (name.length < 2) bad('Enter your restaurant or shop name.');
  if (kind.length < 2) bad('Enter what you sell, e.g. Burgers or Supermarket.');
  if (!AREAS.includes(area)) bad('Choose your area.');
  if (address.length < 8) bad('Enter the full address of your restaurant or shop.');
  if (!PHONE_RE.test(phone)) bad('Enter a contact number like 0300 1234567.');
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'store';
  if (await Store.exists({ _id: id })) id = `${id}-${randomBytes(2).toString('hex')}`;
  const colors = ['#C8102E', '#0B7A3E', '#004E9F', '#6B2D1F', '#7A1F1F', '#1F1F1F', '#D4145A'];
  const [lat, lng] = coordsFor(area);
  const store = await Store.create({
    _id: id, name, type, kind, tags: [kind], area, address, phone, status: 'pending', isDemo: false,
    color: colors[randomInt(colors.length)], cover: type === 'shop' ? 'supermarket' : 'burger', location: { lat, lng },
  });
  user.role = 'partner';
  user.store = store._id;
  await user.save();
  res.status(201).json({ user: user.toPublic(store) });
}));

router.use(requireAuth('partner'));

async function myStore(req) {
  const store = await Store.findById(req.user.store);
  if (!store) throw new HttpError(404, 'Your store was not found.');
  return store;
}

// GET /api/partner/store  — my store, menu and orders
router.get('/store', asyncHandler(async (req, res) => {
  const store = await myStore(req);
  const [products, orders] = await Promise.all([
    Product.find({ store: store._id }).sort({ sort: 1 }),
    Order.find({ store: store._id }).sort({ createdAt: -1 }).limit(200),
  ]);
  res.json({
    store: store.toPublic(),
    products: products.map((p) => p.toPublic()),
    orders: orders.map((o) => o.toPublic({ withRiderToken: true })),
  });
}));

// PATCH /api/partner/store  — open/close, delivery time, fee, minimum
router.patch('/store', asyncHandler(async (req, res) => {
  const store = await myStore(req);
  const b = req.body;
  if (b.isOpen !== undefined) store.isOpen = Boolean(b.isOpen);
  const clamp = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Number(v) : d));
  store.eta.min = clamp(b.etaMin, 5, 180, store.eta.min);
  store.eta.max = clamp(b.etaMax, store.eta.min, 240, store.eta.max);
  store.deliveryFee = clamp(b.deliveryFee, 0, 1000, store.deliveryFee);
  store.minOrder = clamp(b.minOrder, 0, 10000, store.minOrder);
  await store.save();
  res.json({ store: store.toPublic() });
}));

// POST /api/partner/products  — add a menu item
router.post('/products', asyncHandler(async (req, res) => {
  const store = await myStore(req);
  const name = str(req.body.name, 80);
  const price = Number(req.body.price);
  const category = ['food', 'groceries', 'essentials'].includes(req.body.category) ? req.body.category : 'food';
  if (name.length < 2) bad('Enter the item name.');
  if (!Number.isInteger(price) || price < 1 || price > 100000) bad('Enter a price in rupees (whole number).');
  const count = await Product.countDocuments({ store: store._id });
  if (count >= 300) bad('A store can have up to 300 items.');
  const product = await Product.create({
    _id: `${store._id}-${randomBytes(3).toString('hex')}`, store: store._id, section: str(req.body.section, 40) || 'Menu',
    name, category, price, description: str(req.body.description, 200), sort: 10000 + count,
    image: str(req.body.image, 30) || (category === 'food' ? 'burger' : category === 'groceries' ? 'vegetables' : 'soap'),
  });
  res.status(201).json({ product: product.toPublic() });
}));

// PATCH /api/partner/products/:id  — change price or availability
router.patch('/products/:id', asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, store: req.user.store });
  if (!product) throw new HttpError(404, 'Item not found.');
  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (!Number.isInteger(price) || price < 1 || price > 100000) bad('Enter a price in rupees (whole number).');
    product.price = price;
  }
  if (req.body.available !== undefined) product.available = Boolean(req.body.available);
  await product.save();
  res.json({ product: product.toPublic() });
}));

router.delete('/products/:id', asyncHandler(async (req, res) => {
  await Product.deleteOne({ _id: req.params.id, store: req.user.store });
  res.json({ ok: true });
}));

export default router;
