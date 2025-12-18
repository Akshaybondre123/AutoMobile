import express from 'express';
import * as carServiceController from '../controllers/carServiceController.js';

const router = express.Router();
const {
  createService,
  getServicesByAdvisor,
  updateService,
  getServiceById,
  deleteService,
  getStatusHistory,
} = carServiceController;

/**
 * Car Service Routes
 * Defines all API endpoints for car service management
 */

/**
 * @route   POST /api/services
 * @desc    Create a new car service record
 * @access  Public (will be protected with auth later)
 */
router.post('/', createService);

/**
 * @route   PUT /api/services/:id
 * @desc    Update a service record
 * @access  Public (will be protected with auth later)
 */
router.put('/:id', updateService);

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete a service record
 * @access  Public (will be protected with auth later)
 */
router.delete('/:id', deleteService);

/**
 * @route   GET /api/services/advisor/:advisorId
 * @desc    Get all service records for a specific service advisor
 * @access  Public (will be protected with auth later)
 */
// GET /api/services/advisor/:advisorId - Get services by advisor
router.get('/advisor/:advisorId', getServicesByAdvisor);

/**
 * @route   GET /api/services/:id
 * @desc    Get a single service record by ID
 * @access  Public (will be protected with auth later)
 */
router.get('/:id', getServiceById);

/**
 * @route   GET /api/services/:id/status-history
 * @desc    Get status history for a specific service
 * @access  Public (will be protected with auth later)
 */
router.get('/:id/status-history', getStatusHistory);

export default router;
