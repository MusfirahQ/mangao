// Login sessions: a signed JWT stored in an HttpOnly cookie (JavaScript in the browser can't read it).
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { HttpError } from '../utils/helpers.js';

const COOKIE = 'mg_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.VERCEL) throw new Error('JWT_SECRET is not set');
  return 'local-dev-secret-change-me';
}

const cookieOptions = () => ({ httpOnly: true, sameSite: 'lax', secure: Boolean(process.env.VERCEL), path: '/' });

export function setSession(res, user) {
  const token = jwt.sign({ uid: user._id.toString() }, secret(), { expiresIn: MAX_AGE });
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE * 1000 });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, cookieOptions());
}

/** Reads the cookie (if any) and puts the logged-in user on req.user. */
export async function loadUser(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (token) {
      const { uid } = jwt.verify(token, secret());
      req.user = await User.findById(uid);
    }
  } catch {
    req.user = null; // expired or invalid token: treat as logged out
  }
  next();
}

/** Route guard: requireAuth() for any logged-in user, requireAuth('admin') for specific roles. */
export const requireAuth = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Please log in first.'));
  if (roles.length && !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have access to this.'));
  next();
};
