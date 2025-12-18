import CarService from '../models/CarService.js';

/**
 * Car Service Controller
 * Handles all CRUD operations for car service records
 */

/**
 * Create a new car service record
 * @route POST /api/services
 * @access Public (will be protected with auth later)
 */
export const createService = async (req, res) => {
  try {
    const {
      vehicleRegistrationNumber,
      vehicleModel,
      typeOfWork,
      serviceAdvisorId,
      serviceDate,
      ownerName,
      contactInfo
    } = req.body;

    // Validate required fields
    const requiredFields = ['vehicleRegistrationNumber', 'vehicleModel', 'typeOfWork', 'serviceAdvisorId', 'serviceDate', 'ownerName', 'contactInfo'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Create new service record
    const newService = new CarService({
      vehicleRegistrationNumber,
      vehicleModel,
      typeOfWork,
      serviceAdvisorId,
      serviceDate,
      ownerName,
      contactInfo,
      TAT: 0,
      tatActiveSince: serviceDate ? new Date(serviceDate) : new Date(),
      // Keep both status and serviceStatus aligned for consistency
      status: 'inprogress',
      serviceStatus: 'inprogress',
      statusHistory: [{
        status: 'inprogress',
        changedAt: new Date(),
        changedBy: req.body.changedBy || 'System'
      }]
    });

    // Save to database
    const savedService = await newService.save();

    res.status(201).json({
      success: true,
      message: 'Service record created successfully',
      data: savedService
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get all service records for a specific service advisor
 * @route GET /api/services/advisor/:advisorId
 * @access Public (will be protected with auth later)
 */
export const getServicesByAdvisor = async (req, res) => {
  try {
    const { advisorId } = req.params;
    const { page = 1, limit = 7 } = req.query;

    if (!advisorId) {
      return res.status(400).json({
        success: false,
        message: 'Service advisor ID is required'
      });
    }

    // Convert pagination parameters to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination info
    const totalCount = await CarService.countDocuments({ serviceAdvisorId: advisorId });

    // Find services for the given advisor ID with pagination, sorted by date (newest first)
    const services = await CarService.find({ serviceAdvisorId: advisorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: `Found ${services.length} service records for advisor ${advisorId}`,
      data: services,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Get services by advisor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update a service record (RO Date, RO Number, and Service Status)
 * @route PUT /api/services/:id
 * @access Public (will be protected with auth later)
 */
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { roDate, roNumber, serviceStatus, status, changedBy } = req.body;

    // Validate service ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    // Get the current service record
    const existingService = await CarService.findById(id);
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Service record not found'
      });
    }

    // Completed markers used for tab switching in the UI
    const COMPLETED_STATUSES = new Set(['done', 'completed']);
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const daysBetween = (from, to) => {
      if (!from || !to) return 0;
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return 0;
      return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY));
    };

    // Prepare update operations using atomic operators to avoid overwriting history
    const updateOps = { $set: {}, $push: {} };
    
    if (roDate) {
      updateOps.$set.roDate = new Date(roDate);
    }
    
    if (roNumber) {
      updateOps.$set.roNumber = roNumber;
    }

    // Handle status update (primary source of truth)
    if (status && status !== existingService.status) {
      const prevStatus = existingService.status;
      const nextStatus = status;
      const now = new Date();

      const prevDelivered = COMPLETED_STATUSES.has(prevStatus);
      const nextDelivered = COMPLETED_STATUSES.has(nextStatus);

      let currentTAT = Number(existingService.TAT || 0);
      let activeSince = existingService.tatActiveSince ? new Date(existingService.tatActiveSince) : null;

      // If the record is active but tatActiveSince is missing, initialize from serviceDate
      if (!prevDelivered && !activeSince) {
        activeSince = existingService.serviceDate ? new Date(existingService.serviceDate) : now;
        updateOps.$set.tatActiveSince = activeSince;
      }

      // Transition into delivered: freeze and store TAT
      if (!prevDelivered && nextDelivered) {
        const addDays = daysBetween(activeSince, now);
        currentTAT += addDays;
        updateOps.$set.TAT = currentTAT;
        updateOps.$set.tatActiveSince = null;
      }

      // Transition out of delivered back to active (e.g., reopen to inprogress)
      if (prevDelivered && !nextDelivered) {
        updateOps.$set.tatActiveSince = now;
        updateOps.$set.TAT = currentTAT;
      }

      // If still active (not delivered), do NOT increment TAT here.
      // We only persist TAT when transitioning into delivered.
      // While active, tatActiveSince tracks when the active segment started.
      if (!nextDelivered) {
        updateOps.$set.TAT = currentTAT;
      }

      const statusHistoryEntry = {
        status,
        changedAt: new Date(),
        changedBy: changedBy || 'System'
      };

      updateOps.$push.statusHistory = statusHistoryEntry;
      updateOps.$set.status = status;
      // Keep serviceStatus aligned with status so completed items stay in completed tab
      updateOps.$set.serviceStatus = COMPLETED_STATUSES.has(status) ? 'completed' : status;
    } else if (serviceStatus && serviceStatus !== existingService.serviceStatus) {
      // Allow direct serviceStatus updates when provided explicitly
      updateOps.$set.serviceStatus = serviceStatus;
    }

    // Clean up empty operators
    if (Object.keys(updateOps.$set).length === 0) delete updateOps.$set;
    if (Object.keys(updateOps.$push).length === 0) delete updateOps.$push;

    // Nothing to update; return existing record to avoid blocking the UI
    if (!updateOps.$set && !updateOps.$push) {
      return res.status(200).json({
        success: true,
        message: 'No changes detected; service record left unchanged',
        data: existingService
      });
    }

    // Update the service
    const updatedService = await CarService.findByIdAndUpdate(
      id,
      updateOps,
      { 
        new: true, // Return the updated document
        runValidators: true // Run model validators
      }
    );

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: 'Service record not found after update'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service record updated successfully',
      data: updatedService
    });

  } catch (error) {
    console.error('[ERROR] Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get a single service record by ID
 * @route GET /api/services/:id
 * @access Public (will be protected with auth later)
 */
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await CarService.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching service by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Delete a car service record
 * @route DELETE /api/services/:id
 * @access Public (will be protected with auth later)
 */
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the service record
    const deletedService = await CarService.findByIdAndDelete(id);

    if (!deletedService) {
      return res.status(404).json({
        success: false,
        message: 'Service record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service record deleted successfully',
      data: deletedService
    });
  } catch (error) {
    console.error('Error deleting service record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get status history for a specific service
 * @route GET /api/services/:id/status-history
 * @access Public (will be protected with auth later)
 */
export const getStatusHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await CarService.findById(id).select('statusHistory vehicleRegistrationNumber vehicleModel');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        serviceInfo: {
          vehicleRegistrationNumber: service.vehicleRegistrationNumber,
          vehicleModel: service.vehicleModel
        },
        statusHistory: service.statusHistory || []
      }
    });
  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

