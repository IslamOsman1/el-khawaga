import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' }
}, { _id: true });

const loyaltyPointEntrySchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },
  reason: { type: String, trim: true, default: '' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6, default: '' },
  hasManualPassword: { type: Boolean, default: false },
  phone: { type: String, default: '' },
  googleId: { type: String, default: '' },
  avatar: { type: String, default: '' },
  addresses: { type: [addressSchema], default: [] },
  walletBalance: { type: Number, default: 0, min: 0 },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  loyaltyHistory: { type: [loyaltyPointEntrySchema], default: [] },
  resetPasswordCodeHash: { type: String, default: '' },
  resetPasswordCodeExpires: { type: Date, default: null },
  resetPasswordCodeSentAt: { type: Date, default: null },
  permissions: {
    type: [String],
    default: [],
    enum: ['manage_products', 'manage_orders', 'manage_support']
  },
  role: { type: String, enum: ['user', 'admin', 'employee'], default: 'user' }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function(password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
