import express from 'express';
import {
  getAdminSettings,
  getCategorySettings,
  getPublicSettings,
  updateCategorySettings,
  updateSettings,
  uploadBannerImage
} from '../controllers/settingsController.js';
import { admin, hasPermission, protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/public', getPublicSettings);
router.get('/admin', protect, admin, getAdminSettings);
router.get('/admin/categories', protect, hasPermission('manage_products'), getCategorySettings);
router.post('/admin/banner-upload', protect, admin, upload.single('image'), uploadBannerImage);
router.put('/admin', protect, admin, updateSettings);
router.put('/admin/categories', protect, hasPermission('manage_products'), updateCategorySettings);

export default router;
