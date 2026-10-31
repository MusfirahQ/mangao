// Problem reports (tickets) and the support chat, for customers.
import { Router } from 'express';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, bad, str, code } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth());

const TYPES = ['Order or checkout question', 'Missing or incorrect item', 'Delivery/pickup question', 'Payment question', 'Other'];
const ticketView = (t) => ({ id: t._id, order: t.order, type: t.type, description: t.description, status: t.status, reply: t.reply, createdAt: t.createdAt });
const messageView = (m) => ({ id: m._id.toString(), from: m.from, body: m.body, createdAt: m.createdAt });

router.get('/tickets', asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ tickets: tickets.map(ticketView) });
}));

router.post('/tickets', asyncHandler(async (req, res) => {
  if (!TYPES.includes(req.body.type)) bad('Choose what the issue is about.');
  const description = str(req.body.description, 1000);
  if (description.length < 15) bad('Describe the problem in at least 15 characters.');
  let order = str(req.body.orderId, 20) || null;
  if (order && !(await Order.exists({ _id: order, user: req.user._id }))) order = null;
  const ticket = await Ticket.create({ _id: code('CASE'), user: req.user._id, order, type: req.body.type, description });
  res.status(201).json({ ticket: ticketView(ticket) });
}));

router.get('/messages', asyncHandler(async (req, res) => {
  const messages = await Message.find({ user: req.user._id }).sort({ createdAt: 1 });
  res.json({ messages: messages.map(messageView) });
}));

router.post('/messages', asyncHandler(async (req, res) => {
  const body = str(req.body.body, 1000);
  if (!body) bad('Type a message first.');
  const first = !(await Message.exists({ user: req.user._id }));
  await Message.create({ user: req.user._id, from: 'user', body });
  if (first) {
    await Message.create({ user: req.user._id, from: 'support', body: 'Thanks for your message! A member of the Mangao team will reply here. You can close this page; your conversation is saved.' });
  }
  const messages = await Message.find({ user: req.user._id }).sort({ createdAt: 1 });
  res.json({ messages: messages.map(messageView) });
}));

export default router;
