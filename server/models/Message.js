import mongoose from 'mongoose';

// One support chat per customer: every message stores which customer the conversation belongs to.
const messageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    from: { type: String, enum: ['user', 'support'], required: true },
    body: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
