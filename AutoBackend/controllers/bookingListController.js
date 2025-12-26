import BookingListData from '../models/BookingListData.js';
import { performVINMatching } from '../services/vinMatchingService.js';
import mongoose from 'mongoose';

/**
 * BookingList Controller
 * Handles BookingList specific API endpoints with VIN matching
 * Now supports advisor filtering - advisors only see their own data
 */

/**
 * GET /api/booking-list/dashboard
 * Get BookingList data with VIN matching and status categorization
 * For Service Advisor role: only returns bookings where advisor_id matches user._id
 * For all other roles (Owner, Service Manager, custom roles): returns all bookings for the showroom
 */
export const getBookingListDashboard = async (req, res) => {
  try {
    console.log('🎯 BookingList Dashboard API called with params:', req.query);
    console.log('👤 User from token:', req.user);
    
    const { uploadedBy, city, showroom_id } = req.query;
    
    // Use showroom_id from token if available, otherwise from query
    const effectiveShowroomId = req.user?.showroom_id || showroom_id;
    
    if (!effectiveShowroomId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: showroom_id'
      });
    }

    // Build query - filter by advisor_id ONLY if user has Service Advisor role
    // All other roles (Owner, Service Manager, custom roles) can see all advisor data
    // IMPORTANT: Always filter by showroom_id to ensure data isolation
    let bookingQuery = {
      showroom_id: new mongoose.Types.ObjectId(effectiveShowroomId)
    };

    // Only Service Advisors should see only their own bookings from their showroom
    // All other roles can see all bookings from the showroom
    if (req.user && req.user.isServiceAdvisor === true) {
      // Service Advisor: filter by both advisor_id AND showroom_id
      // This ensures advisors only see their own bookings from their assigned showroom
      bookingQuery.advisor_id = new mongoose.Types.ObjectId(req.user._id);
      console.log(`🔒 Service Advisor mode: Filtering bookings for advisor_id: ${req.user._id}, showroom_id: ${effectiveShowroomId}`);
      
      // DEBUG: Check how many bookings exist for this advisor
      const advisorBookingCount = await BookingListData.countDocuments({
        advisor_id: new mongoose.Types.ObjectId(req.user._id),
        showroom_id: new mongoose.Types.ObjectId(effectiveShowroomId)
      });
      console.log(`📊 DEBUG: Found ${advisorBookingCount} bookings with advisor_id=${req.user._id} in showroom=${effectiveShowroomId}`);
      
      // DEBUG: Check if there are bookings with this advisor's name but no advisor_id
      const advisorName = req.user.name || '';
      if (advisorName) {
        const bookingsByName = await BookingListData.countDocuments({
          service_advisor: { $regex: new RegExp(advisorName, 'i') },
          showroom_id: new mongoose.Types.ObjectId(effectiveShowroomId),
          $or: [
            { advisor_id: { $exists: false } },
            { advisor_id: null }
          ]
        });
        if (bookingsByName > 0) {
          console.log(`⚠️ WARNING: Found ${bookingsByName} bookings with advisor name "${advisorName}" but no advisor_id set!`);
          console.log(`💡 Tip: These bookings need to be re-uploaded or advisor_id needs to be populated`);
        }
      }
    } else {
      // Non-Advisor roles: only filter by showroom_id (see all advisors in their showroom)
      console.log(`👑 Non-Advisor role mode: Showing all bookings for showroom: ${effectiveShowroomId}`);
    }

    // For Service Advisors: Don't filter by uploaded_by - they should see all bookings linked to them via advisor_id
    // For other roles: Filter by uploaded_by to show only files they uploaded
    if (req.user && req.user.isServiceAdvisor === true) {
      // Service Advisor: Don't filter by uploaded_by - just use advisor_id and showroom_id
      // This allows them to see bookings from any uploaded file that's linked to them
      console.log(`🔒 Service Advisor: Skipping uploaded_by filter - will use advisor_id filter instead`);
    } else if (uploadedBy) {
      // Non-advisor roles: Filter by uploaded files (existing behavior)
      const userFiles = await mongoose.model('UploadedFileMetaDetails').find({
        uploaded_by: uploadedBy,
        file_type: 'booking_list',
        showroom_id: new mongoose.Types.ObjectId(effectiveShowroomId),
        processing_status: 'completed'
      }).select('_id').lean();

      if (userFiles.length > 0) {
        bookingQuery.uploaded_file_id = { $in: userFiles.map(f => f._id) };
      } else {
        // No files found for this user, return empty result
        return res.json({
          success: true,
          data: [],
          summary: {
            totalBookings: 0,
            matchedVINs: 0,
            unmatchedVINs: 0,
            statusBreakdown: [],
            serviceAdvisorBreakdown: [],
            traditionalServiceAdvisorBreakdown: [],
            workTypeBreakdown: []
          },
          vinMatching: {
            totalBookings: 0,
            matchedVINs: 0,
            unmatchedVINs: 0,
            statusSummary: {}
          }
        });
      }
    }

    console.log(`🎯 Getting BookingList dashboard data for: "${uploadedBy || 'all'}", showroom: ${effectiveShowroomId}`);

    // DEBUGGING: Check what data actually exists in the database
    const totalBookingRecords = await BookingListData.countDocuments();
    const existingShowroomIds = await BookingListData.distinct('showroom_id');
    const bookingsByShowroom = await BookingListData.aggregate([
      { $group: { _id: '$showroom_id', count: { $sum: 1 } } }
    ]);
    
    console.log(`📊 Database Debug Info:`);
    console.log(`   Total BookingList records: ${totalBookingRecords}`);
    console.log(`   Existing showroom_ids:`, existingShowroomIds);
    console.log(`   Records per showroom:`, bookingsByShowroom);
    console.log(`   Querying for showroom_id: ${showroom_id} (type: ${typeof showroom_id})`);

    // Perform VIN matching and get enhanced booking data
    // Pass advisor_id filter ONLY if user is Service Advisor
    // All other roles see all advisor data
    const advisorIdFilter = req.user && req.user.isServiceAdvisor === true ? req.user._id : null;
    
    // For Service Advisors: Don't pass uploadedBy - they should see all bookings linked to them
    // For other roles: Pass uploadedBy to filter by files they uploaded
    const effectiveUploadedBy = (req.user && req.user.isServiceAdvisor === true) ? null : uploadedBy;
    
    const vinMatchingResult = await performVINMatching(
      effectiveUploadedBy, 
      city || 'Unknown', 
      effectiveShowroomId,
      advisorIdFilter
    );

    // Handle case when no data is found
    if (!vinMatchingResult || !vinMatchingResult.bookings) {
      console.log('⚠️ No booking data found for the given parameters');
      return res.json({
        success: true,
        data: [],
        summary: {
          totalBookings: 0,
          matchedVINs: 0,
          unmatchedVINs: 0,
          statusBreakdown: [],
          serviceAdvisorBreakdown: [],
          traditionalServiceAdvisorBreakdown: [],
          workTypeBreakdown: []
        },
        vinMatching: {
          totalBookings: 0,
          matchedVINs: 0,
          unmatchedVINs: 0,
          statusSummary: {}
        }
      });
    }

    // Create status breakdown for dashboard
    const statusBreakdown = Object.keys(vinMatchingResult.statusSummary || {}).map(category => ({
      status: vinMatchingResult.statusSummary[category].status,
      category: category,
      count: vinMatchingResult.statusSummary[category].count
    }));

    // Create work type breakdown from traditional service advisor breakdown
    const workTypeBreakdown = (vinMatchingResult.traditionalServiceAdvisorBreakdown || []).reduce((acc, advisor) => {
      // This is a simplified work type breakdown for backward compatibility
      // The detailed advisor-worktype breakdown is in serviceAdvisorBreakdown
      return acc;
    }, []);

    console.log(`✅ BookingList dashboard data retrieved: ${vinMatchingResult.totalBookings} bookings`);
    console.log(`📊 VIN matching: ${vinMatchingResult.matchedVINs} matched, ${vinMatchingResult.unmatchedVINs} unmatched`);

    res.json({
      success: true,
      data: vinMatchingResult.bookings,
      summary: {
        totalBookings: vinMatchingResult.totalBookings,
        matchedVINs: vinMatchingResult.matchedVINs,
        unmatchedVINs: vinMatchingResult.unmatchedVINs,
        statusBreakdown: statusBreakdown,
        serviceAdvisorBreakdown: vinMatchingResult.serviceAdvisorBreakdown, // New detailed advisor-worktype breakdown
        traditionalServiceAdvisorBreakdown: vinMatchingResult.traditionalServiceAdvisorBreakdown, // For backward compatibility
        workTypeBreakdown: workTypeBreakdown
      },
      vinMatching: {
        totalBookings: vinMatchingResult.totalBookings,
        matchedVINs: vinMatchingResult.matchedVINs,
        unmatchedVINs: vinMatchingResult.unmatchedVINs,
        statusSummary: vinMatchingResult.statusSummary
      }
    });

  } catch (error) {
    console.error('❌ Error getting BookingList dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error retrieving BookingList dashboard data'
    });
  }
};

/**
 * GET /api/booking-list/vin-status/:vin
 * Check VIN matching status for a specific VIN
 */
export const getVINStatus = async (req, res) => {
  try {
    const { vin } = req.params;
    const { showroom_id } = req.query;
    
    if (!vin || !showroom_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: vin, showroom_id'
      });
    }

    // Check if VIN exists in BookingList
    const bookingRecord = await BookingListData.findOne({
      vin_number: { $regex: new RegExp(`^${vin.trim()}$`, 'i') },
      showroom_id: new mongoose.Types.ObjectId(showroom_id)
    }).lean();

    // Check if VIN exists in RepairOrderList
    const repairOrderVINs = await vinMatchingService.getRepairOrderVINs(null, null, showroom_id);
    const isVINMatched = repairOrderVINs.has(vin.trim().toUpperCase());

    res.status(200).json({
      success: true,
      data: {
        vin: vin,
        existsInBookingList: !!bookingRecord,
        existsInRepairOrderList: isVINMatched,
        isMatched: !!bookingRecord && isVINMatched,
        bookingRecord: bookingRecord
      }
    });

  } catch (error) {
    console.error('❌ Error checking VIN status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error checking VIN status'
    });
  }
};

/**
 * Helper function to get service advisor breakdown
 */
const getServiceAdvisorBreakdown = (bookings) => {
  const advisorCounts = {};
  
  bookings.forEach(booking => {
    const advisor = booking.service_advisor || 'Unknown';
    if (!advisorCounts[advisor]) {
      advisorCounts[advisor] = {
        advisor: advisor,
        count: 0,
        converted: 0,
        processing: 0,
        tomorrow: 0,
        future: 0
      };
    }
    advisorCounts[advisor].count++;
    
    // Count by status category
    switch (booking.status_category) {
      case 'converted':
        advisorCounts[advisor].converted++;
        break;
      case 'processing':
        advisorCounts[advisor].processing++;
        break;
      case 'tomorrow':
        advisorCounts[advisor].tomorrow++;
        break;
      case 'future':
        advisorCounts[advisor].future++;
        break;
    }
  });
  
  return Object.values(advisorCounts).sort((a, b) => b.count - a.count);
};

/**
 * Helper function to get work type breakdown
 */
const getWorkTypeBreakdown = (bookings) => {
  const workTypeCounts = {};
  
  bookings.forEach(booking => {
    const workType = booking.work_type || 'Unknown';
    if (!workTypeCounts[workType]) {
      workTypeCounts[workType] = {
        type: workType,
        count: 0,
        converted: 0,
        processing: 0,
        tomorrow: 0,
        future: 0
      };
    }
    workTypeCounts[workType].count++;
    
    // Count by status category
    switch (booking.status_category) {
      case 'converted':
        workTypeCounts[workType].converted++;
        break;
      case 'processing':
        workTypeCounts[workType].processing++;
        break;
      case 'tomorrow':
        workTypeCounts[workType].tomorrow++;
        break;
      case 'future':
        workTypeCounts[workType].future++;
        break;
    }
  });
  
  return Object.values(workTypeCounts).sort((a, b) => b.count - a.count);
};

export default {
  getBookingListDashboard,
  getVINStatus
};
