import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, default: 0 },
  category: { type: String, required: true, index: true },
  subcategory: { type: String, default: '', index: true },
  brand: { type: String, default: 'Burger El Khawaga' },
  barcode: { type: String, default: '', trim: true, index: true },
  unit: { type: String, default: 'وجبة' },
  measurementValue: { type: Number, default: 0, min: 0 },
  measurementUnit: { type: String, default: '', trim: true },
  countInStock: { type: Number, min: 0, default: 0 },
  featured: { type: Boolean, default: false },
  inAgencyCollection: { type: Boolean, default: false, index: true },
  isDeal: { type: Boolean, default: false },
  image: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  reviews: { type: [reviewSchema], default: [] },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
