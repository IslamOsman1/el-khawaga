import express from 'express';
import {
  getMySupportConversation,
  listSupportConversations,
  markMySupportConversationRead,
  markSupportConversationRead,
  replySupportConversation,
  setMySupportConversationStatus,
  setSupportConversationStatus,
  sendMySupportMessage
} from '../controllers/supportController.js';
import { hasPermission, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/my', protect, getMySupportConversation);
router.post('/my/message', protect, sendMySupportMessage);
router.put('/my/read', protect, markMySupportConversationRead);
router.put('/my/status', protect, setMySupportConversationStatus);
router.get('/inbox', protect, hasPermission('manage_support'), listSupportConversations);
router.post('/:id/reply', protect, hasPermission('manage_support'), replySupportConversation);
router.put('/:id/read', protect, hasPermission('manage_support'), markSupportConversationRead);
router.put('/:id/status', protect, hasPermission('manage_support'), setSupportConversationStatus);

export default router;
