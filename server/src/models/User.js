import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: '' },
  governorate: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  street: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' }
}, { _id: true });

const loyaltyPointEntrySchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },
  reason: { type: String, trim: true, default: '' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  source: { type: String, trim: true, default: 'system' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const privateDiscountCodeSchema = new mongoose.Schema({
  code: { type: String, trim: true, default: '' },
  type: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  value: { type: Number, default: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  note: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const customerCareEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['wallet_credit', 'points_credit', 'discount_code', 'store_purchase'],
    default: 'wallet_credit'
  },
  amount: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  code: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, trim: true },
  expirationTime: { type: Number, default: null },
  keys: {
    p256dh: { type: String, required: true, trim: true },
    auth: { type: String, required: true, trim: true }
  },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6, default: '' },
  hasManualPassword: { type: Boolean, default: false },
  phone: { type: String, default: '' },
  customerCode: { type: String, unique: true, sparse: true, index: true },
  googleId: { type: String, default: '' },
  avatar: { type: String, default: '' },
  addresses: { type: [addressSchema], default: [] },
  walletBalance: { type: Number, default: 0, min: 0 },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
  loyaltyHistory: { type: [loyaltyPointEntrySchema], default: [] },
  privateDiscountCodes: { type: [privateDiscountCodeSchema], default: [] },
  customerCareHistory: { type: [customerCareEntrySchema], default: [] },
  pushSubscriptions: { type: [pushSubscriptionSchema], default: [] },
  inStoreSpentTotal: { type: Number, default: 0, min: 0 },
  resetPasswordCodeHash: { type: String, default: '' },
  resetPasswordCodeExpires: { type: Date, default: null },
  resetPasswordCodeSentAt: { type: Date, default: null },
  permissions: {
    type: [String],
    default: [],
    enum: [
      'manage_products',
      'manage_orders',
      'manage_support',
      'manage_customers',
      'manage_customer_care',
      'manage_store_purchases',
      'manage_loyalty'
    ]
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
