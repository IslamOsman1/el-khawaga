import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, default: 0 },
  category: { type: String, required: true, index: true },
  subcategory: { type: String, default: '', index: true },
  brand: { type: String, default: 'Al Wekala' },
  unit: { type: String, default: 'قطعة' },
  countInStock: { type: Number, required: true, min: 0, default: 0 },
  featured: { type: Boolean, default: false },
  inAgencyCollection: { type: Boolean, default: false, index: true },
  isDeal: { type: Boolean, default: false },
  image: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
