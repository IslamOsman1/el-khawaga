import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import { assertDeletePassword } from '../utils/deleteProtection.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const generateProductBarcode = () => `PRD-${Date.now().toString(36).toUpperCase()}`;

export const getProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const keyword = req.query.keyword
    ? {
      $or: [
        { name: { $regex: escapeRegex(req.query.keyword), $options: 'i' } },
        { description: { $regex: escapeRegex(req.query.keyword), $options: 'i' } },
        { category: { $regex: escapeRegex(req.query.keyword), $options: 'i' } },
        { subcategory: { $regex: escapeRegex(req.query.keyword), $options: 'i' } },
        { barcode: { $regex: escapeRegex(req.query.keyword), $options: 'i' } }
      ]
    }
    : {};
  const category = req.query.category ? { category: req.query.category } : {};
  const subcategory = req.query.subcategory ? { subcategory: req.query.subcategory } : {};
  const isDeal = req.query.deals === 'true' ? { isDeal: true } : {};
  const inAgencyCollection = req.query.agency === 'true' ? { inAgencyCollection: true } : {};
  const query = { ...keyword, ...category, ...subcategory, ...isDeal, ...inAgencyCollection };
  const count = await Product.countDocuments(query);
  const products = await Product.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit);
  res.json({ products, page, pages: Math.ceil(count / limit), count });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('reviews.user', 'name avatar');
  if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });
  res.json(product);
});

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await Product.distinct('category');
  res.json(categories);
});

export const createProduct = asyncHandler(async (req, res) => {
  const data = {
    ...req.body,
    price: Number(req.body.price || 0),
    oldPrice: Number(req.body.oldPrice || 0),
    countInStock: Number(req.body.countInStock || 0),
    barcode: String(req.body.barcode || '').trim() || generateProductBarcode(),
    measurementValue: Number(req.body.measurementValue || 0),
    measurementUnit: String(req.body.measurementUnit || '').trim(),
    inAgencyCollection: req.body.inAgencyCollection ?? req.body.featured ?? false
  };

  let image = { url: '', publicId: '' };
  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer);
      image = { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      error.message = error.message || 'تعذر رفع صورة المنتج';
      throw error;
    }
  }

  const product = await Product.create({ ...data, image });
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

  Object.assign(product, {
    ...req.body,
    price: Number(req.body.price || 0),
    oldPrice: Number(req.body.oldPrice || 0),
    countInStock: Number(req.body.countInStock || 0),
    barcode: String(req.body.barcode || '').trim(),
    measurementValue: Number(req.body.measurementValue || 0),
    measurementUnit: String(req.body.measurementUnit || '').trim(),
    inAgencyCollection: req.body.inAgencyCollection ?? req.body.featured ?? product.inAgencyCollection
  });

  if (req.file) {
    if (product.image?.publicId) await cloudinary.uploader.destroy(product.image.publicId);
    try {
      const result = await uploadToCloudinary(req.file.buffer);
      product.image = { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      error.message = error.message || 'تعذر رفع صورة المنتج';
      throw error;
    }
  }

  await product.save();
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await assertDeletePassword(req.body?.deletePassword);

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

  if (product.image?.publicId) {
    await cloudinary.uploader.destroy(product.image.publicId);
  }

  await product.deleteOne();
  res.json({ message: 'تم حذف المنتج' });
});

export const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'المنتج غير موجود' });
  }

  const normalizedComment = String(comment || '').trim();
  const numericRating = Number(rating || 0);

  if (!normalizedComment) {
    return res.status(400).json({ message: 'أضف تعليقًا قبل الإرسال' });
  }

  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'اختر تقييمًا من 1 إلى 5' });
  }

  const existingReview = product.reviews.find((entry) => entry.user?.toString() === req.user._id.toString());

  if (existingReview) {
    existingReview.rating = numericRating;
    existingReview.comment = normalizedComment;
    existingReview.name = req.user.name || existingReview.name;
  } else {
    product.reviews.unshift({
      user: req.user._id,
      name: req.user.name || 'مستخدم',
      rating: numericRating,
      comment: normalizedComment
    });
  }

  product.numReviews = product.reviews.length;
  product.rating = product.numReviews
    ? Number((product.reviews.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / product.numReviews).toFixed(1))
    : 0;

  await product.save();
  await product.populate('reviews.user', 'name avatar');

  res.status(201).json({
    message: existingReview ? 'تم تحديث تقييمك' : 'تم إرسال تقييمك بنجاح',
    product
  });
});
