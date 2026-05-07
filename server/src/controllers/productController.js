import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import { assertDeletePassword } from '../utils/deleteProtection.js';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const keyword = req.query.keyword
    ? {
      name: { $regex: escapeRegex(req.query.keyword), $options: 'i' }
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
  const product = await Product.findById(req.params.id);
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
    barcode: String(req.body.barcode || '').trim(),
    inAgencyCollection: req.body.inAgencyCollection ?? req.body.featured ?? false
  };

  let image = { url: '', publicId: '' };
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer);
    image = { url: result.secure_url, publicId: result.public_id };
  }

  const product = await Product.create({ ...data, image });
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

  Object.assign(product, {
    ...req.body,
    barcode: String(req.body.barcode || '').trim(),
    inAgencyCollection: req.body.inAgencyCollection ?? req.body.featured ?? product.inAgencyCollection
  });

  if (req.file) {
    if (product.image?.publicId) await cloudinary.uploader.destroy(product.image.publicId);
    const result = await uploadToCloudinary(req.file.buffer);
    product.image = { url: result.secure_url, publicId: result.public_id };
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
