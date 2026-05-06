import express from 'express';
import { hasPermission, protect } from '../middleware/auth.js';
import { allOrders, cancelMyOrder, createOrder, getOrderById, myOrders, updateOrderStatus } from '../controllers/orderController.js';

const router = express.Router();
router.post('/', protect, createOrder);
router.get('/my', protect, myOrders);
router.put('/:id/cancel', protect, cancelMyOrder);
router.get('/', protect, hasPermission('manage_orders'), allOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, hasPermission('manage_orders'), updateOrderStatus);
export default router;
