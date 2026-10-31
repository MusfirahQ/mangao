// The logged-in customer's own data: profile, password, addresses, favourites, export, delete.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import { requireAuth, clearSession } from '../middleware/auth.js';
import { asyncHandler, bad, HttpError, str, validateContact, AREAS } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth());

const addressView = (a) => ({ id: a._id.toString(), label: a.label, line: a.line, area: a.area, isDefault: a.isDefault });

// PATCH /api/me  — update name and phone
router.patch('/', asyncHandler(async (req, res) => {
  const c = validateContact({ name: req.body.name, phone: req.body.phone, email: req.user.email }, { requireContact: false });
  req.user.name = c.name;
  req.user.phone = c.phone;
  await req.user.save();
  const store = req.user.store ? await Store.findById(req.user.store) : null;
  res.json({ user: req.user.toPublic(store) });
}));

// POST /api/me/password
router.post('/password', asyncHandler(async (req, res) => {
  if (!(await bcrypt.compare(String(req.body.current || ''), req.user.passwordHash))) bad('Your current password is incorrect.');
  if (String(req.body.next || '').length < 8) bad('New password must be at least 8 characters.');
  req.user.passwordHash = await bcrypt.hash(String(req.body.next), 10);
  await req.user.save();
  res.json({ ok: true });
}));

// GET /api/me/export  — download everything stored about me
router.get('/export', asyncHandler(async (req, res) => {
  const u = req.user;
  res.json({
    profile: { name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt },
    addresses: u.addresses.map(addressView),
    favourites: u.favourites,
    orders: (await Order.find({ user: u._id }).sort({ createdAt: -1 })).map((o) => o.toPublic()),
    tickets: await Ticket.find({ user: u._id }).lean(),
    messages: await Message.find({ user: u._id }).sort({ createdAt: 1 }).lean(),
  });
}));

// DELETE /api/me  — delete my account (password required)
router.delete('/', asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') bad('Admin accounts cannot be deleted here.');
  if (!(await bcrypt.compare(String(req.body.password || ''), req.user.passwordHash))) bad('Password is incorrect.');
  const id = req.user._id;
  await Promise.all([Order.deleteMany({ user: id }), Ticket.deleteMany({ user: id }), Message.deleteMany({ user: id })]);
  await User.deleteOne({ _id: id });
  clearSession(res);
  res.json({ ok: true });
}));

/* ---------- addresses (stored inside the user document) ---------- */
router.get('/addresses', (req, res) => res.json({ addresses: req.user.addresses.map(addressView) }));

router.post('/addresses', asyncHandler(async (req, res) => {
  const line = str(req.body.line, 150);
  const area = str(req.body.area, 40);
  const label = ['Home', 'Work', 'University', 'Other'].includes(req.body.label) ? req.body.label : 'Other';
  if (line.length < 6) bad('Enter a street address with house number and street.');
  if (!AREAS.includes(area)) bad('Choose an area.');
  if (req.user.addresses.length >= 10) bad('You can save up to 10 addresses.');
  req.user.addresses.push({ label, line, area, isDefault: req.user.addresses.length === 0 });
  await req.user.save();
  res.status(201).json({ address: addressView(req.user.addresses[req.user.addresses.length - 1]) });
}));

router.post('/addresses/:id/default', asyncHandler(async (req, res) => {
  if (!req.user.addresses.id(req.params.id)) throw new HttpError(404, 'Address not found.');
  req.user.addresses.forEach((a) => { a.isDefault = a._id.toString() === req.params.id; });
  await req.user.save();
  res.json({ ok: true });
}));

router.delete('/addresses/:id', asyncHandler(async (req, res) => {
  const a = req.user.addresses.id(req.params.id);
  if (a) {
    const wasDefault = a.isDefault;
    a.deleteOne();
    if (wasDefault && req.user.addresses[0]) req.user.addresses[0].isDefault = true;
    await req.user.save();
  }
  res.json({ ok: true });
}));

/* ---------- favourites ---------- */
router.get('/favourites', (req, res) => res.json({ products: req.user.favourites.products, vendors: req.user.favourites.stores }));

// POST /api/me/favourites { kind: 'products' | 'vendors', id }  — toggles on/off
router.post('/favourites', asyncHandler(async (req, res) => {
  const isStore = req.body.kind === 'vendors';
  const id = str(req.body.id, 80);
  const exists = isStore ? await Store.exists({ _id: id }) : await Product.exists({ _id: id });
  if (!exists) bad('That item no longer exists.');
  const list = isStore ? req.user.favourites.stores : req.user.favourites.products;
  const on = !list.includes(id);
  if (on) list.push(id); else list.pull(id);
  await req.user.save();
  res.json({ on });
}));

export default router;
