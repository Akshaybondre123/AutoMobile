import express from 'express';
import { getBookingListDashboard, getVINStatus } from '../controllers/bookingListController.js';
import { authenticateToken } from '../middleware/advisorAuthMiddleware.js';

const router = express.Router();

/**
 * BookingList Routes
 * Handles BookingList specific endpoints with VIN matching
 * Now supports advisor authentication and filtering
 */

// GET /api/booking-list/dashboard - Get BookingList dashboard data with VIN matching
// For ADVISOR: only returns their own bookings
// For ADMIN: returns all bookings
router.get('/dashboard', authenticateToken, getBookingListDashboard);

// GET /api/booking-list/vin-status/:vin - Check VIN matching status
router.get('/vin-status/:vin', authenticateToken, getVINStatus);

export default router;
