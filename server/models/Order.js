import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  product: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1, max: 99 },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: '' },
  at: { type: Date, default: Date.now },
}, { _id: false });

export const STATUSES = ['placed', 'accepted', 'preparing', 'on_the_way', 'delivered', 'ready', 'collected', 'cancelled', 'rejected'];

const orderSchema = new mongoose.Schema(
  {
    _id: { type: String }, // order number, e.g. "MG-7KQ2PX"
    checkoutId: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    store: { type: String, ref: 'Store', required: true, index: true },
    storeName: String,
    storeArea: String,
    storeEta: Number,
    storeLocation: { lat: Number, lng: Number },
    mode: { type: String, enum: ['delivery', 'pickup'], required: true },
    status: { type: String, enum: STATUSES, default: 'placed' },
    address: { type: String, default: '' },
    destination: { lat: Number, lng: Number },
    contact: { name: String, phone: String, email: String },
    payment: { type: String, default: 'Cash' },
    when: { type: String, default: 'As soon as possible' },
    notes: { type: String, default: '' },
    riderNote: { type: String, default: '' },
    items: { type: [itemSchema], default: [] },
    subtotal: Number,
    deliveryFee: Number,
    discount: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    total: Number,
    promo: { type: String, default: null },
    rating: { type: Number, default: null },
    events: { type: [eventSchema], default: [] },
    rider: {
      token: { type: String, index: true, sparse: true },
      lat: Number,
      lng: Number,
      accuracy: Number,
      at: Date,
    },
  },
  { timestamps: true }
);

const FINAL = ['delivered', 'collected', 'cancelled', 'rejected'];
orderSchema.virtual('isActive').get(function isActive() { return !FINAL.includes(this.status); });

/** Shape sent to the browser. `withRiderToken` is only for the store and admins. */
orderSchema.methods.toPublic = function toPublic({ withRiderToken = false } = {}) {
  const has = (p) => p && p.lat != null && p.lng != null;
  return {
    id: this._id, checkoutId: this.checkoutId, userId: this.user.toString(), storeId: this.store,
    storeName: this.storeName, storeArea: this.storeArea, storeEta: this.storeEta,
    mode: this.mode, status: this.status, address: this.address, contact: this.contact, payment: this.payment,
    when: this.when, notes: this.notes, riderNote: this.riderNote, subtotal: this.subtotal,
    deliveryFee: this.deliveryFee, discount: this.discount, tip: this.tip, total: this.total, promo: this.promo,
    rating: this.rating, createdAt: this.createdAt, updatedAt: this.updatedAt,
    items: this.items.map((i) => ({ productId: i.product, name: i.name, price: i.price, qty: i.qty })),
    events: this.events.map((e) => ({ status: e.status, note: e.note, at: e.at })),
    storeLocation: has(this.storeLocation) ? { lat: this.storeLocation.lat, lng: this.storeLocation.lng } : null,
    destination: has(this.destination) ? { lat: this.destination.lat, lng: this.destination.lng, approximate: true } : null,
    // the rider's live position is only shown while the order is on its way
    rider: this.status === 'on_the_way' && this.rider?.at
      ? { lat: this.rider.lat, lng: this.rider.lng, accuracy: this.rider.accuracy, at: this.rider.at } : null,
    ...(withRiderToken ? { riderToken: this.rider?.token || null } : {}),
  };
};

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
