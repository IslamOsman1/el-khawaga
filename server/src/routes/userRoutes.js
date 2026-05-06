import express from 'express';
import { allUsers, updateUserRole } from '../controllers/userController.js';
import { admin, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, admin, allUsers);
router.put('/:id/role', protect, admin, updateUserRole);

export default router;
