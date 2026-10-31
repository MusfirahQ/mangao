import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Store from '../models/Store.js';
import { setSession, clearSession } from '../middleware/auth.js';
import { asyncHandler, bad, HttpError, EMAIL_RE, str, validateContact } from '../utils/helpers.js';

const router = Router();

async function publicUser(user) {
  const store = user.store ? await Store.findById(user.store) : null;
  return user.toPublic(store);
}

// POST /api/auth/register  — create a customer account and log in
router.post('/register', asyncHandler(async (req, res) => {
  const contact = validateContact(req.body, { requireContact: false });
  const email = str(req.body.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) bad('Enter a valid email like name@example.com.');
  const password = String(req.body.password || '');
  if (password.length < 8) bad('Password must be at least 8 characters.');
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists. Try logging in.');
  const user = await User.create({ name: contact.name, email, phone: contact.phone, passwordHash: await bcrypt.hash(password, 10) });
  setSession(res, user);
  res.status(201).json({ user: await publicUser(user) });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  setSession(res, user);
  res.json({ user: await publicUser(user) });
}));

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// GET /api/auth/me  — who is logged in (null if nobody)
router.get('/me', asyncHandler(async (req, res) => {
  res.json({ user: req.user ? await publicUser(req.user) : null });
}));

export default router;
