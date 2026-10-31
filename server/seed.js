// Fills an empty database with the starting stores, menus, the promo code and the admin account.
import { readFileSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import Store from './models/Store.js';
import Product from './models/Product.js';
import Promo from './models/Promo.js';
import User from './models/User.js';
import { coordsFor } from './utils/geo.js';

const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));

export async function seed() {
  if ((await Store.countDocuments()) === 0) {
    await Store.insertMany(catalog.stores.map((s) => {
      const [lat, lng] = coordsFor(s.area);
      return {
        _id: s.id, name: s.name, type: s.type, kind: s.kind, tags: s.tags, rating: s.rating, ratings: s.ratings,
        eta: { min: s.eta[0], max: s.eta[1] }, deliveryFee: s.deliveryFee, freeDeliveryOver: s.freeDeliveryOver,
        minOrder: s.minOrder, area: s.area, color: s.color, cover: s.cover, featured: s.featured,
        isDemo: true, status: 'active', location: { lat, lng },
      };
    }), { ordered: false }).catch(() => {});
    await Product.insertMany(catalog.products.map((p, i) => ({
      _id: p.id, store: p.vendorId, section: p.section, name: p.name, category: p.category, price: p.price,
      image: p.image, description: p.description, featured: p.featured, isNew: p.isNew, available: p.available, sort: i,
    })), { ordered: false }).catch(() => {});
  }

  if (!(await Promo.exists({ _id: 'MANGO150' }))) {
    await Promo.create({ _id: 'MANGO150', amount: 150, active: true, description: 'Rs. 150 off, once per customer' }).catch(() => {});
  }

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (adminEmail && process.env.ADMIN_PASSWORD) {
    const admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      await User.create({ name: 'Mangao Admin', email: adminEmail, role: 'admin', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10) }).catch(() => {});
    } else if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
    }
  }

  // Optional demo store-owner account (manages the KFC demo listing by default)
  const demoEmail = (process.env.DEMO_PARTNER_EMAIL || '').trim().toLowerCase();
  if (demoEmail && process.env.DEMO_PARTNER_PASSWORD && !(await User.exists({ email: demoEmail }))) {
    await User.create({
      name: 'Demo Partner', email: demoEmail, role: 'partner', store: process.env.DEMO_PARTNER_STORE || 'kfc',
      passwordHash: await bcrypt.hash(process.env.DEMO_PARTNER_PASSWORD, 10),
    }).catch(() => {});
  }
}
