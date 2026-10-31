import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    _id: { type: String }, // e.g. "kfc-1"
    store: { type: String, ref: 'Store', required: true, index: true },
    section: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, enum: ['food', 'groceries', 'essentials'], required: true },
    price: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    description: { type: String, default: '', maxlength: 200 },
    featured: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

productSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id, vendorId: this.store, section: this.section, name: this.name, category: this.category,
    price: this.price, image: this.image, description: this.description, featured: this.featured,
    isNew: this.isNew, available: this.available,
  };
};

export default mongoose.models.Product || mongoose.model('Product', productSchema);
