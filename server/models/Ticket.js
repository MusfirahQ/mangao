import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    _id: { type: String }, // case number, e.g. "CASE-4F7K2Q"
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: String, default: null },
    type: { type: String, required: true },
    description: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    reply: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
