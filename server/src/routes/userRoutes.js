import express from 'express';
import { allUsers } from '../controllers/userController.js';
import { admin, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, admin, allUsers);

export default router;
