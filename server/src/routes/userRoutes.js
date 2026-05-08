import express from 'express';
import {
  allUsers,
  applyCustomerCareAction,
  getMyPushConfig,
  getMySettings,
  removeMyPushSubscription,
  saveMyPushSubscription,
  searchCustomerCareUsers,
  updateMySettings,
  updateUserRole,
  uploadMyAvatar
} from '../controllers/userController.js';
import { admin, hasPermission, protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/me', protect, getMySettings);
router.get('/me/push-config', protect, getMyPushConfig);
router.post('/me/push-subscription', protect, saveMyPushSubscription);
router.delete('/me/push-subscription', protect, removeMyPushSubscription);
router.put('/me', protect, updateMySettings);
router.post('/me/avatar', protect, upload.single('image'), uploadMyAvatar);
router.get('/customer-care', protect, hasPermission(['manage_customers', 'manage_customer_care', 'manage_store_purchases']), searchCustomerCareUsers);
router.post('/:id/customer-care', protect, hasPermission(['manage_customers', 'manage_customer_care', 'manage_store_purchases', 'manage_loyalty']), applyCustomerCareAction);
router.get('/', protect, admin, allUsers);
router.put('/:id/role', protect, admin, updateUserRole);

export default router;
