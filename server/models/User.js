import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, enum: ['Home', 'Work', 'University', 'Other'], default: 'Home' },
  line: { type: String, required: true, trim: true, maxlength: 150 },
  area: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'partner', 'admin'], default: 'customer' },
    store: { type: String, ref: 'Store', default: null }, // for partners: the store they manage
    addresses: { type: [addressSchema], default: [] },
    favourites: {
      products: { type: [String], default: [] },
      stores: { type: [String], default: [] },
    },
    usedPromos: { type: [String], default: [] },
  },
  { timestamps: true }
);

// What the browser is allowed to see about a user
userSchema.methods.toPublic = function toPublic(store) {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    storeId: this.store,
    store: store ? { id: store._id, name: store.name, status: store.status } : null,
  };
};

export default mongoose.models.User || mongoose.model('User', userSchema);
