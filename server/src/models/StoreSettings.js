import mongoose from 'mongoose';

const heroSlideSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  note: { type: String, default: '' },
  tag: { type: String, default: '' },
  image: { type: String, default: '' },
  link: { type: String, default: '' }
}, { _id: false });

const featuredCategorySchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  category: { type: String, default: '' },
  image: { type: String, default: '' }
}, { _id: false });

const categorySectionSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  sourceCategory: { type: String, default: '' }
}, { _id: false });

const categoryGroupSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  sections: {
    type: [categorySectionSchema],
    default: []
  }
}, { _id: false });

const checkoutGovernorateSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  shippingFee: { type: Number, default: 35 },
  cities: {
    type: [String],
    default: []
  }
}, { _id: false });

const discountCodeSchema = new mongoose.Schema({
  code: { type: String, default: '' },
  type: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  value: { type: Number, default: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null }
}, { _id: false });

const storeSettingsSchema = new mongoose.Schema({
  singleton: { type: String, default: 'default', unique: true },
  storeName: { type: String, default: 'Al Wekala Market' },
  storeTagline: { type: String, default: 'تجربة تسوق سريعة وواضحة لكل احتياجات البيت.' },
  supportEmail: { type: String, default: 'support@alwekala.com' },
  supportPhone: { type: String, default: '01000000000' },
  address: { type: String, default: 'القاهرة، مصر' },
  workingHours: { type: String, default: 'يوميًا من 9 صباحًا حتى 11 مساءً' },
  whatsapp: { type: String, default: '' },
  about: {
    title: { type: String, default: 'من نحن' },
    description: {
      type: String,
      default: 'الوكالة منصة تسوق إلكتروني تهدف إلى تقديم تجربة أسرع وأسهل لشراء المنتجات اليومية والعروض في مكان واحد.'
    },
    vision: { type: String, default: 'تقديم تجربة شراء بسيطة وواضحة تساعد العميل يصل إلى ما يحتاجه بسرعة.' },
    mission: { type: String, default: 'توفير المنتجات اليومية والعروض في واجهة سهلة ومريحة على الموبايل والكمبيوتر.' },
    values: { type: String, default: 'الوضوح، السرعة، سهولة الاستخدام، والاهتمام بتجربة العميل في كل خطوة.' }
  },
  home: {
    heroSlides: {
      type: [heroSlideSchema],
      default: []
    },
    featuredCategories: {
      type: [featuredCategorySchema],
      default: []
    }
  },
  categoryGroups: {
    type: [categoryGroupSchema],
    default: []
  },
  checkout: {
    shippingFee: { type: Number, default: 35 },
    freeShippingThreshold: { type: Number, default: 500 },
    notesEnabled: { type: Boolean, default: true },
    notesRequired: { type: Boolean, default: false },
    governorates: {
      type: [checkoutGovernorateSchema],
      default: []
    }
  },
  payment: {
    cashOnDeliveryEnabled: { type: Boolean, default: true },
    onlinePaymentEnabled: { type: Boolean, default: false },
    onlineProvider: { type: String, default: 'stripe' },
    currency: { type: String, default: 'egp' },
    stripePublishableKey: { type: String, default: '' },
    stripeSecretKey: { type: String, default: '' }
  },
  loyalty: {
    enabled: { type: Boolean, default: true },
    pointsPerPoint: { type: Number, default: 10 },
    pointValue: { type: Number, default: 0.1 },
    minRedeemPoints: { type: Number, default: 50 },
    discountCodes: {
      type: [discountCodeSchema],
      default: []
    }
  },
  integrations: {
    googleClientId: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.model('StoreSettings', storeSettingsSchema);
