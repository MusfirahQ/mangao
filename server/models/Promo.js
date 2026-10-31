import mongoose from 'mongoose';

const promoSchema = new mongoose.Schema({
  _id: { type: String }, // the code itself, e.g. "MANGO150"
  amount: { type: Number, required: true },
  active: { type: Boolean, default: true },
  description: { type: String, default: '' },
});

export default mongoose.models.Promo || mongoose.model('Promo', promoSchema);
