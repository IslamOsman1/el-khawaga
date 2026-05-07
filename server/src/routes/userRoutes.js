import express from 'express';
import {
  allUsers,
  applyCustomerCareAction,
  getMySettings,
  searchCustomerCareUsers,
  updateMySettings,
  updateUserRole,
  uploadMyAvatar
} from '../controllers/userController.js';
import { admin, hasPermission, protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/me', protect, getMySettings);
router.put('/me', protect, updateMySettings);
router.post('/me/avatar', protect, upload.single('image'), uploadMyAvatar);
router.get('/customer-care', protect, hasPermission('manage_customers'), searchCustomerCareUsers);
router.post('/:id/customer-care', protect, hasPermission('manage_customers'), applyCustomerCareAction);
router.get('/', protect, admin, allUsers);
router.put('/:id/role', protect, admin, updateUserRole);

export default router;
