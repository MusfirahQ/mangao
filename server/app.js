// The Express application: middleware, API routes and error handling.
import express from 'express';
import cookieParser from 'cookie-parser';
import { connectDB } from './db.js';
import { loadUser } from './middleware/auth.js';
import { HttpError } from './utils/helpers.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import meRoutes from './routes/me.js';
import orderRoutes from './routes/orders.js';
import riderRoutes from './routes/rider.js';
import partnerRoutes from './routes/partner.js';
import supportRoutes from './routes/support.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const api = express.Router();

api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  // Basic CSRF protection: changes must be sent as JSON (other sites can't do that without permission)
  if (req.method !== 'GET' && !req.is('application/json')) return next(new HttpError(415, 'Requests must be JSON.'));
  next();
});

api.get('/health', (_req, res) => res.json({ ok: true }));

// connect to MongoDB (once) before handling any other API request
api.use(async (_req, _res, next) => {
  try { await connectDB(); next(); } catch (err) { next(err); }
});
api.use(loadUser);

api.use('/auth', authRoutes);
api.use('/catalog', catalogRoutes);
api.use('/me', meRoutes);
api.use('/orders', orderRoutes);
api.use('/rider', riderRoutes);
api.use('/partner', partnerRoutes);
api.use('/support', supportRoutes);
api.use('/admin', adminRoutes);
api.use((_req, _res, next) => next(new HttpError(404, 'Not found.')));

app.use('/api', api);

// Error handler: known errors become { error: message }, anything else is logged and hidden.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0]?.message || 'Invalid data.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

export default app;
