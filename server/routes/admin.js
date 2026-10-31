// Admin panel: stats, all orders, stores (approve/suspend/assign owner), reports, customer messages, users.
import { Router } from 'express';
import User from '../models/User.js';
import Store from '../models/Store.js';
import Order from '../models/Order.js';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, bad, HttpError, str, FINAL } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth('admin'));

const messageView = (m) => ({ id: m._id.toString(), from: m.from, body: m.body, createdAt: m.createdAt });

// GET /api/admin/overview
router.get('/overview', asyncHandler(async (_req, res) => {
  const [users, orders, stores, tickets, recentMessages, revenueOrders] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(100),
    Order.find().sort({ createdAt: -1 }).limit(100),
    Store.find().sort({ name: 1 }),
    Ticket.find().sort({ createdAt: -1 }).limit(100).populate('user', 'name email'),
    Message.find().sort({ createdAt: -1 }).limit(500),
    Order.find({ status: { $in: ['delivered', 'collected'] } }, { total: 1 }),
  ]);
  const owners = await User.find({ role: 'partner' }, { email: 1, store: 1 });

  // group messages into one conversation per customer
  const convMap = new Map();
  for (const m of recentMessages) {
    const key = m.user.toString();
    if (!convMap.has(key)) convMap.set(key, { userId: key, count: 0, lastAt: m.createdAt, lastFrom: m.from });
    convMap.get(key).count += 1;
  }
  const convUsers = await User.find({ _id: { $in: [...convMap.keys()] } }, { name: 1, email: 1 });
  const conversations = convUsers.map((u) => ({ ...convMap.get(u._id.toString()), name: u.name, email: u.email }))
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

  res.json({
    stats: {
      users: await User.countDocuments(),
      orders: await Order.countDocuments(),
      activeOrders: await Order.countDocuments({ status: { $nin: FINAL } }),
      revenue: revenueOrders.reduce((s, o) => s + (o.total || 0), 0),
      openTickets: await Ticket.countDocuments({ status: 'open' }),
      pendingStores: await Store.countDocuments({ status: 'pending' }),
    },
    orders: orders.map((o) => o.toPublic({ withRiderToken: true })),
    stores: stores.map((s) => ({ ...s.toPublic(), ownerEmail: owners.find((o) => o.store === s._id)?.email || null }))
      .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending')),
    users: users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email, phone: u.phone, role: u.role, storeId: u.store, createdAt: u.createdAt })),
    tickets: tickets.map((t) => ({ id: t._id, order: t.order, type: t.type, description: t.description, status: t.status, reply: t.reply, createdAt: t.createdAt, userName: t.user?.name, userEmail: t.user?.email }))
      .sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open')),
    conversations,
  });
}));

// POST /api/admin/stores/:id { status }
router.post('/stores/:id', asyncHandler(async (req, res) => {
  if (!['active', 'pending', 'suspended'].includes(req.body.status)) bad('Unknown status.');
  const store = await Store.findById(req.params.id);
  if (!store) throw new HttpError(404, 'Store not found.');
  store.status = req.body.status;
  await store.save();
  res.json({ store: store.toPublic() });
}));

// POST /api/admin/stores/:id/owner { email }  — link an existing account to a store
router.post('/stores/:id/owner', asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: str(req.body.email, 120).toLowerCase() });
  if (!user) bad('No account with that email. Ask the owner to sign up first.');
  if (user.role === 'admin') bad('Admins cannot be store owners.');
  if (!(await Store.exists({ _id: req.params.id }))) throw new HttpError(404, 'Store not found.');
  user.role = 'partner';
  user.store = req.params.id;
  await user.save();
  res.json({ ok: true });
}));

// POST /api/admin/tickets/:id { reply }  — reply and mark resolved
router.post('/tickets/:id', asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw new HttpError(404, 'Report not found.');
  ticket.status = req.body.status === 'open' ? 'open' : 'resolved';
  ticket.reply = str(req.body.reply, 1000);
  await ticket.save();
  res.json({ ticket: { id: ticket._id, status: ticket.status, reply: ticket.reply } });
}));

// Support chat with one customer
router.get('/messages/:userId', asyncHandler(async (req, res) => {
  const messages = await Message.find({ user: req.params.userId }).sort({ createdAt: 1 });
  res.json({ messages: messages.map(messageView) });
}));

router.post('/messages/:userId', asyncHandler(async (req, res) => {
  const body = str(req.body.body, 1000);
  if (!body) bad('Type a reply first.');
  if (!(await User.exists({ _id: req.params.userId }))) throw new HttpError(404, 'User not found.');
  await Message.create({ user: req.params.userId, from: 'support', body });
  const messages = await Message.find({ user: req.params.userId }).sort({ createdAt: 1 });
  res.json({ messages: messages.map(messageView) });
}));

export default router;
