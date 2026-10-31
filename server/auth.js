// Passwords are hashed with bcrypt. The session is a signed JWT stored in an HttpOnly cookie,
// so JavaScript in the browser can't read it.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const COOKIE = 'mg_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.VERCEL) throw new Error('JWT_SECRET is not set');
    return 'local-dev-secret-change-me';
  }
  return s;
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

export function setSession(res, user) {
  const token = jwt.sign({ uid: user.id }, secret(), { expiresIn: MAX_AGE });
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`);
}

export function clearSession(res) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export function readSession(req) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    return jwt.verify(match.slice(COOKIE.length + 1), secret());
  } catch {
    return null;
  }
}
