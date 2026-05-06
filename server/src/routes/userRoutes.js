import express from 'express';
import { allUsers, getMySettings, updateMySettings, updateUserRole, uploadMyAvatar } from '../controllers/userController.js';
import { admin, protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/me', protect, getMySettings);
router.put('/me', protect, updateMySettings);
router.post('/me/avatar', protect, upload.single('image'), uploadMyAvatar);
router.get('/', protect, admin, allUsers);
router.put('/:id/role', protect, admin, updateUserRole);

export default router;
