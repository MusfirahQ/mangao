import { Router } from 'express';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();

// GET /api/catalog  — every active store and its menu
router.get('/', asyncHandler(async (_req, res) => {
  const stores = await Store.find({ status: 'active' }).sort({ featured: -1, rating: -1 });
  const ids = stores.map((s) => s._id);
  const products = await Product.find({ store: { $in: ids } }).sort({ store: 1, sort: 1 });
  res.json({ stores: stores.map((s) => s.toPublic()), products: products.map((p) => p.toPublic()) });
}));

export default router;
