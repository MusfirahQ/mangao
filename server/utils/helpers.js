import { randomInt } from 'node:crypto';

/** Error with an HTTP status code. Thrown inside routes, turned into JSON by the error middleware. */
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const bad = (msg) => { throw new HttpError(400, msg); };

/** Wraps an async route so thrown errors reach Express's error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^(?:\+92|0)3\d{9}$/;
export const normPhone = (v) => String(v || '').replace(/[\s-]/g, '');
export const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);

export const AREAS = ['Johar Town', 'DHA', 'Gulberg', 'Model Town', 'Bahria Town', 'Wapda Town', 'Township', 'Garden Town', 'Cantt', 'Iqbal Town'];
export const PAYMENTS = ['Cash', 'Card (demo)', 'Wallet (demo)'];
export const TIPS = [0, 50, 100, 150];
export const FLOW = {
  delivery: ['placed', 'accepted', 'preparing', 'on_the_way', 'delivered'],
  pickup: ['placed', 'accepted', 'preparing', 'ready', 'collected'],
};
export const FINAL = ['delivered', 'collected', 'cancelled', 'rejected'];

/** Short readable codes like MG-7KQ2PX (no easily confused letters). */
export function code(prefix, len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[randomInt(chars.length)];
  return `${prefix}-${out}`;
}

/** Delivery fee for one store: free above its free-delivery threshold. */
export function feeFor(store, subtotal) {
  if (store.deliveryFee === 0) return 0;
  if (store.freeDeliveryOver && subtotal >= store.freeDeliveryOver) return 0;
  return store.deliveryFee;
}

/** Checks name / phone / email. Returns the cleaned values or throws a 400 error. */
export function validateContact({ name, phone, email }, { requireContact = true } = {}) {
  const n = str(name, 60);
  const p = normPhone(phone);
  const e = str(email, 120).toLowerCase();
  if (n.length < 2) bad('Enter your name (at least 2 characters).');
  if (requireContact && !p && !e) bad('Add a mobile number or an email so you can be reached.');
  if (p && !PHONE_RE.test(p)) bad('Enter a Pakistani mobile number like 0300 1234567.');
  if (e && !EMAIL_RE.test(e)) bad('Enter a valid email like name@example.com.');
  return { name: n, phone: p, email: e };
}
