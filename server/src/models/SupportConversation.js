import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['customer', 'support'], required: true },
  text: { type: String, required: true, trim: true }
}, { timestamps: true, _id: true });

const supportConversationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  customerUnreadCount: { type: Number, default: 0, min: 0 },
  supportUnreadCount: { type: Number, default: 0, min: 0 },
  customerLastReadAt: { type: Date, default: null },
  supportLastReadAt: { type: Date, default: null },
  messages: [supportMessageSchema]
}, { timestamps: true });

export default mongoose.model('SupportConversation', supportConversationSchema);
