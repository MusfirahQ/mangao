// Rider live location. The store gets a secret link per order (no login needed: the long random
// token in the link is the permission). The rider's phone sends its GPS position here.
import { Router } from 'express';
import Order from '../models/Order.js';
import { asyncHandler, bad, HttpError } from '../utils/helpers.js';
import { validLatLng } from '../utils/geo.js';

const router = Router();

async function riderOrder(token) {
  const t = String(token || '');
  if (t.length < 20) throw new HttpError(404, 'This rider link is not valid.');
  const order = await Order.findOne({ 'rider.token': t });
  if (!order) throw new HttpError(404, 'This rider link is not valid.');
  return order;
}

// Only what the rider needs to deliver
const riderView = (order) => {
  const o = order.toPublic();
  return {
    id: o.id, status: o.status, storeName: o.storeName, storeArea: o.storeArea, address: o.address,
    contact: { name: o.contact.name, phone: o.contact.phone }, items: o.items, total: o.total, payment: o.payment,
    notes: o.notes, riderNote: o.riderNote, storeLocation: o.storeLocation, destination: o.destination, rider: o.rider,
  };
};

router.get('/:token', asyncHandler(async (req, res) => {
  res.json({ order: riderView(await riderOrder(req.params.token)) });
}));

// POST /api/rider/:token/location { lat, lng, accuracy }
router.post('/:token/location', asyncHandler(async (req, res) => {
  const order = await riderOrder(req.params.token);
  if (order.status !== 'on_the_way') bad('This order is no longer out for delivery, so location sharing has stopped.');
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!validLatLng(lat, lng)) bad('Invalid location.');
  const accuracy = Math.max(0, Math.min(100000, Number(req.body.accuracy) || 0));
  await Order.updateOne({ _id: order._id }, { $set: { 'rider.lat': lat, 'rider.lng': lng, 'rider.accuracy': accuracy, 'rider.at': new Date() } });
  res.json({ ok: true });
}));

// POST /api/rider/:token/delivered
router.post('/:token/delivered', asyncHandler(async (req, res) => {
  const order = await riderOrder(req.params.token);
  if (order.status !== 'on_the_way') bad('This order is not out for delivery.');
  order.status = 'delivered';
  order.events.push({ status: 'delivered', note: 'Marked delivered by rider' });
  await order.save();
  res.json({ order: riderView(order) });
}));

export default router;
