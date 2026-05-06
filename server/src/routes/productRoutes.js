import express from 'express';
import { hasPermission, protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { createProduct, deleteProduct, getCategories, getProduct, getProducts, updateProduct } from '../controllers/productController.js';

const router = express.Router();
router.get('/', getProducts);
router.get('/categories/list', getCategories);
router.get('/:id', getProduct);
router.post('/', protect, hasPermission('manage_products'), upload.single('image'), createProduct);
router.put('/:id', protect, hasPermission('manage_products'), upload.single('image'), updateProduct);
router.delete('/:id', protect, hasPermission('manage_products'), deleteProduct);
export default router;
