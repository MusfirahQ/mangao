import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema(
  {
    _id: { type: String }, // readable id used in links, e.g. "kfc"
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['restaurant', 'shop'], required: true },
    kind: { type: String, required: true },
    tags: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    ratings: { type: Number, default: 0 },
    eta: { min: { type: Number, default: 30 }, max: { type: Number, default: 45 } },
    deliveryFee: { type: Number, default: 99 },
    freeDeliveryOver: { type: Number, default: 0 },
    minOrder: { type: Number, default: 0 },
    area: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    color: { type: String, default: '#F5A900' },
    cover: { type: String, default: 'burger' },
    featured: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    isOpen: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'active' },
    location: { lat: Number, lng: Number },
  },
  { timestamps: true }
);

storeSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id, name: this.name, type: this.type, kind: this.kind, tags: this.tags,
    rating: this.rating, ratings: this.ratings, eta: [this.eta.min, this.eta.max],
    deliveryFee: this.deliveryFee, freeDeliveryOver: this.freeDeliveryOver, minOrder: this.minOrder,
    area: this.area, address: this.address, color: this.color, cover: this.cover, featured: this.featured,
    isDemo: this.isDemo, isOpen: this.isOpen, status: this.status, location: this.location,
  };
};

export default mongoose.models.Store || mongoose.model('Store', storeSchema);
