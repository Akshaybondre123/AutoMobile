import BookingListData from '../models/BookingListData.js';
import RepairOrderListData from '../models/RepairOrderListData.js';
import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';
import mongoose from 'mongoose';

/**
 * VIN Matching Service
 * Handles VIN matching between BookingList and RepairOrderList
 * Works regardless of upload order
 */

/**
 * Get all VINs from RepairOrderList for a specific user/showroom
 * FIXED: For Service Advisors (when uploadedBy is null), get ALL repair orders from showroom
 * For other roles, filter by user's uploaded files only
 */
export const getRepairOrderVINs = async (uploadedBy, city, showroom_id) => {
  try {
    console.log(`🔍 Getting RepairOrder VINs for: ${uploadedBy || 'all users (Service Advisor mode)'}, ${city}, showroom: ${showroom_id}`);
    
    let repairOrderFiles;
    
    // If uploadedBy is null (Service Advisor mode), get ALL repair order files from the showroom
    // This is because Service Advisors don't upload repair orders - managers do
    // But VIN matching should work across all repair orders in the showroom
    if (!uploadedBy) {
      console.log(`🔒 Service Advisor mode: Getting ALL repair order files from showroom ${showroom_id}`);
      // Convert showroom_id to string if it's an ObjectId (RepairOrderListData stores showroom_id as String)
      const showroomIdStr = showroom_id ? showroom_id.toString() : showroom_id;
      repairOrderFiles = await UploadedFileMetaDetails.find({
        file_type: 'repair_order_list',
        showroom_id: showroomIdStr, // Match as string
        processing_status: 'completed'
      }).select('_id').lean();
    } else {
      // For other roles: Get only the current user's uploaded Repair Order files
      repairOrderFiles = await UploadedFileMetaDetails.find({
        uploaded_by: uploadedBy,
        file_type: 'repair_order_list',
        showroom_id: showroom_id,
        processing_status: 'completed'
      }).select('_id').lean();
    }
    
    console.log(`🔒 Found ${repairOrderFiles.length} repair order files ${uploadedBy ? `uploaded by ${uploadedBy}` : 'in showroom'}`);
    
    // If no repair order files found, return empty set
    if (repairOrderFiles.length === 0) {
      console.log(`⚠️ No repair order files found ${uploadedBy ? `for user ${uploadedBy}` : 'in showroom'} - VIN matching will show 0 matches`);
      return new Set();
    }
    
    // Get repair orders from the files
    const fileIds = repairOrderFiles.map(file => file._id);
    // IMPORTANT: showroom_id in RepairOrderListData is stored as String, not ObjectId
    const showroomIdStr = showroom_id ? showroom_id.toString() : showroom_id;
    const repairOrders = await RepairOrderListData.find({
      uploaded_file_id: { $in: fileIds },
      showroom_id: showroomIdStr // Filter by showroom_id to ensure data isolation
    }).select('vin showroom_id').lean();
    
    console.log(`📋 Query details: showroom_id=${showroomIdStr}, fileIds=${fileIds.length}, found ${repairOrders.length} repair orders`);
    
    const vinSet = new Set();
    let vinCount = 0;
    let emptyVinCount = 0;
    
    repairOrders.forEach(order => {
      if (order.vin && order.vin.trim()) {
        const normalizedVIN = order.vin.trim().toUpperCase();
        vinSet.add(normalizedVIN);
        vinCount++;
      } else {
        emptyVinCount++;
      }
    });
    
    console.log(`📊 VIN Extraction: ${vinCount} VINs extracted, ${emptyVinCount} empty VINs, ${vinSet.size} unique VINs`);
    if (vinSet.size > 0 && vinSet.size <= 10) {
      console.log(`📋 Sample VINs:`, Array.from(vinSet).slice(0, 5));
    }
    
    return vinSet;
  } catch (error) {
    console.error('❌ Error getting RepairOrder VINs:', error);
    return new Set();
  }
};

/**
 * Get all VINs from BookingList for a specific user/showroom
 * FIXED: Now properly filters by user's uploaded files only
 */
export const getBookingListVINs = async (uploadedBy, city, showroom_id) => {
  try {
    console.log(`🔍 Getting BookingList VINs for: ${uploadedBy}, ${city}`);
    
    // SECURITY FIX: Get only the current user's uploaded Booking List files
    const userBookingFiles = await UploadedFileMetaDetails.find({
      uploaded_by: uploadedBy,
      file_type: 'booking_list',
      showroom_id: showroom_id,
      processing_status: 'completed'
    }).select('_id').lean();
    
    console.log(`🔒 Found ${userBookingFiles.length} booking list files uploaded by ${uploadedBy}`);
    
    // If user has no booking files, return empty set
    if (userBookingFiles.length === 0) {
      console.log(`⚠️ No booking list files found for user ${uploadedBy}`);
      return new Set();
    }
    
    // Get bookings only from user's uploaded files
    const userFileIds = userBookingFiles.map(file => file._id);
    const bookings = await BookingListData.find({
      uploaded_file_id: { $in: userFileIds }
    }).select('vin_number').lean();
    
    const vinSet = new Set();
    bookings.forEach(booking => {
      if (booking.vin_number && booking.vin_number.trim()) {
        vinSet.add(booking.vin_number.trim().toUpperCase());
      }
    });
    
    console.log(`📊 Found ${vinSet.size} unique VINs in user's BookingList (from ${userBookingFiles.length} files)`);
    return vinSet;
  } catch (error) {
    console.error('❌ Error getting BookingList VINs:', error);
    return new Set();
  }
};

/**
 * Perform VIN matching and return enhanced BookingList data with statuses
 * @param {string} uploadedBy - Email of user who uploaded files
 * @param {string} city - City name
 * @param {string} showroom_id - Showroom ID
 * @param {string|null} advisorIdFilter - If provided, only return bookings for this advisor ID
 */
export const performVINMatching = async (uploadedBy, city, showroom_id, advisorIdFilter = null) => {
  try {
    console.log(`🎯 Starting VIN matching for: ${uploadedBy}, ${city}, showroom: ${showroom_id}`);
    if (advisorIdFilter) {
      console.log(`🔒 Advisor filter active: Only showing bookings for advisor_id: ${advisorIdFilter}`);
    }
    
    // Get all VINs from RepairOrderList (already filtered by user)
    const repairOrderVINs = await getRepairOrderVINs(uploadedBy, city, showroom_id);
    
    // Build query for booking files
    const bookingFileQuery = {
      file_type: 'booking_list',
      showroom_id: showroom_id,
      processing_status: 'completed'
    };
    
    // For Service Advisors: Don't filter by uploaded_by - they should see all bookings linked to them
    // For other roles: Filter by uploaded_by to show only files they uploaded
    if (advisorIdFilter) {
      // Service Advisor mode: Don't filter by uploaded_by - will filter by advisor_id instead
      console.log(`🔒 Service Advisor mode: Skipping uploaded_by filter - will use advisor_id filter instead`);
    } else if (uploadedBy) {
      // Non-advisor mode: Filter by uploaded files (existing behavior)
      bookingFileQuery.uploaded_by = uploadedBy;
    }
    
    const userBookingFiles = await UploadedFileMetaDetails.find(bookingFileQuery)
      .select('_id')
      .lean();
    
    console.log(`🔒 Found ${userBookingFiles.length} booking list files`);
    
    // If user has no booking files, return empty result
    if (userBookingFiles.length === 0) {
      console.log(`⚠️ No booking list files found`);
      return {
        bookings: [],
        statusSummary: {},
        totalBookings: 0,
        matchedVINs: 0,
        unmatchedVINs: 0,
        serviceAdvisorBreakdown: [],
        traditionalServiceAdvisorBreakdown: []
      };
    }
    
    // Build query for bookings
    // IMPORTANT: Always filter by showroom_id to ensure data isolation
    const bookingQuery = {
      uploaded_file_id: { $in: userBookingFiles.map(file => file._id) },
      showroom_id: new mongoose.Types.ObjectId(showroom_id) // Always filter by showroom
    };
    
    // Add advisor filter if provided (for Service Advisor role)
    // This ensures advisors only see their own bookings from their showroom
    if (advisorIdFilter) {
      bookingQuery.advisor_id = new mongoose.Types.ObjectId(advisorIdFilter);
      console.log(`🔒 Filtering by advisor_id: ${advisorIdFilter} AND showroom_id: ${showroom_id}`);
    }
    
    // Get bookings with optional advisor filter (always filtered by showroom)
    const bookings = await BookingListData.find(bookingQuery).lean();
    
    if (advisorIdFilter) {
      console.log(`📋 Found ${bookings.length} booking records for advisor_id: ${advisorIdFilter} in showroom: ${showroom_id}`);
    } else {
      console.log(`📋 Found ${bookings.length} booking records from user's uploaded files`);
    }
    
    // If no bookings found, return empty result
    if (bookings.length === 0) {
      if (advisorIdFilter) {
        console.log(`⚠️ No BookingList records found for advisor_id: ${advisorIdFilter} in showroom: ${showroom_id}`);
        console.log(`💡 Tip: Make sure bookings have advisor_id populated and match the advisor's user ID`);
      } else {
        console.log(`⚠️ No BookingList records found for user ${uploadedBy}`);
      }
      return {
        bookings: [],
        statusSummary: {},
        totalBookings: 0,
        matchedVINs: 0,
        unmatchedVINs: 0,
        serviceAdvisorBreakdown: [],
        traditionalServiceAdvisorBreakdown: []
      };
    }
    
    // Debug: Log VIN matching details
    console.log(`🔍 VIN Matching Debug:`);
    console.log(`   - Total bookings to check: ${bookings.length}`);
    console.log(`   - Total repair order VINs available: ${repairOrderVINs.size}`);
    if (repairOrderVINs.size > 0 && repairOrderVINs.size <= 10) {
      console.log(`   - Sample repair order VINs:`, Array.from(repairOrderVINs).slice(0, 5));
    }
    if (bookings.length > 0) {
      const firstBookingVIN = bookings[0].vin_number ? bookings[0].vin_number.trim().toUpperCase() : '';
      console.log(`   - Sample booking VIN: "${firstBookingVIN}"`);
      if (firstBookingVIN) {
        console.log(`   - Is first booking VIN in repair orders? ${repairOrderVINs.has(firstBookingVIN)}`);
      }
    }
    
    // Process each booking and determine status
    let matchedCount = 0;
    let unmatchedCount = 0;
    const sampleMatches = [];
    const sampleUnmatches = [];
    
    const enhancedBookings = bookings.map(booking => {
      const bookingVIN = booking.vin_number ? booking.vin_number.trim().toUpperCase() : '';
      const isVINMatched = bookingVIN && repairOrderVINs.has(bookingVIN);
      
      // Debug first few matches/unmatches
      if (isVINMatched && matchedCount < 3) {
        sampleMatches.push(bookingVIN);
        matchedCount++;
      } else if (!isVINMatched && bookingVIN && unmatchedCount < 3) {
        sampleUnmatches.push(bookingVIN);
        unmatchedCount++;
      }
      
      // Determine status based on VIN matching and date
      let status = 'Unknown';
      let statusCategory = 'unknown';
      
      if (isVINMatched) {
        // Case 1: VIN MATCH FOUND
        status = 'Converted';
        statusCategory = 'converted';
      } else {
        // Case 2: VIN NOT MATCHED - Check date
        const bookingDate = parseBookingDate(booking.bt_date_time);
        if (bookingDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          bookingDate.setHours(0, 0, 0, 0);
          
          if (bookingDate <= today) {
            // Past or present date
            status = 'Booking Processing';
            statusCategory = 'processing';
          } else if (bookingDate.getTime() === tomorrow.getTime()) {
            // Tomorrow
            status = 'Tomorrow Delivery';
            statusCategory = 'tomorrow';
          } else {
            // Future date
            status = 'Future Delivery';
            statusCategory = 'future';
          }
        } else {
          // No valid date
          status = 'Booking Processing';
          statusCategory = 'processing';
        }
      }
      
      return {
        ...booking,
        vin_matched: isVINMatched,
        computed_status: status,
        status_category: statusCategory,
        booking_date_parsed: parseBookingDate(booking.bt_date_time)
      };
    });
    
    // Group by status for summary
    const statusSummary = enhancedBookings.reduce((acc, booking) => {
      const category = booking.status_category;
      if (!acc[category]) {
        acc[category] = {
          status: booking.computed_status,
          count: 0,
          records: []
        };
      }
      acc[category].count++;
      acc[category].records.push(booking);
      return acc;
    }, {});
    
    const finalMatchedCount = enhancedBookings.filter(b => b.vin_matched).length;
    const finalUnmatchedCount = enhancedBookings.filter(b => !b.vin_matched).length;
    
    console.log(`✅ VIN matching completed ${uploadedBy ? `for user ${uploadedBy}` : 'for Service Advisor'}: ${enhancedBookings.length} bookings processed`);
    console.log(`📊 Matched VINs: ${finalMatchedCount}, Unmatched VINs: ${finalUnmatchedCount}`);
    if (sampleMatches.length > 0) {
      console.log(`✅ Sample matched VINs:`, sampleMatches);
    }
    if (sampleUnmatches.length > 0) {
      console.log(`❌ Sample unmatched VINs:`, sampleUnmatches);
      // Check if any unmatched VINs exist in repair orders (for debugging)
      const firstUnmatch = sampleUnmatches[0];
      if (firstUnmatch && repairOrderVINs.has(firstUnmatch)) {
        console.log(`⚠️ WARNING: VIN ${firstUnmatch} exists in repairOrderVINs but wasn't matched!`);
      } else if (firstUnmatch) {
        console.log(`💡 VIN ${firstUnmatch} not found in repair order VINs`);
      }
    }
    console.log(`🔒 Data isolation: ${advisorIdFilter ? `Advisor ID filter: ${advisorIdFilter}` : `User's own booking and repair order data used`}`);
    console.log(`📈 Status breakdown:`, Object.keys(statusSummary).map(key => `${key}: ${statusSummary[key].count}`).join(', '));
    
    // Create Service Advisor breakdown with work types and status
    const serviceAdvisorBreakdown = enhancedBookings.reduce((acc, booking) => {
      const advisor = booking.service_advisor || 'Unknown';
      const workType = booking.work_type || 'Unknown';
      const excelStatus = booking.booking_status || booking.status || 'Unknown'; // Actual Excel Status
      const statusCategory = booking.status_category;
      
      if (!acc[advisor]) {
        acc[advisor] = {
          advisor: advisor,
          count: 0,
          converted: 0,
          processing: 0,
          tomorrow: 0,
          future: 0,
          workTypes: {}
        };
      }
      
      // Initialize work type if not exists
      if (!acc[advisor].workTypes[workType]) {
        acc[advisor].workTypes[workType] = {
          type: workType,
          count: 0,
          converted: 0,
          processing: 0,
          tomorrow: 0,
          future: 0,
          excelStatuses: {} // Track actual Excel statuses
        };
      }
      
      // Track Excel Status counts
      if (!acc[advisor].workTypes[workType].excelStatuses[excelStatus]) {
        acc[advisor].workTypes[workType].excelStatuses[excelStatus] = 0;
      }
      acc[advisor].workTypes[workType].excelStatuses[excelStatus]++;
      
      // Increment counts
      acc[advisor].count++;
      acc[advisor].workTypes[workType].count++;
      
      // Increment status counts
      if (statusCategory === 'converted') {
        acc[advisor].converted++;
        acc[advisor].workTypes[workType].converted++;
      } else if (statusCategory === 'processing') {
        acc[advisor].processing++;
        acc[advisor].workTypes[workType].processing++;
      } else if (statusCategory === 'tomorrow') {
        acc[advisor].tomorrow++;
        acc[advisor].workTypes[workType].tomorrow++;
      } else if (statusCategory === 'future') {
        acc[advisor].future++;
        acc[advisor].workTypes[workType].future++;
      }
      
      return acc;
    }, {});

    // Convert to array and flatten work types
    const advisorWorkTypeBreakdown = [];
    Object.values(serviceAdvisorBreakdown).forEach(advisor => {
      Object.values(advisor.workTypes).forEach(workType => {
        advisorWorkTypeBreakdown.push({
          advisor: advisor.advisor,
          workType: workType.type,
          count: workType.count,
          converted: workType.converted,
          processing: workType.processing,
          tomorrow: workType.tomorrow,
          future: workType.future,
          conversionRate: workType.count > 0 ? Math.round((workType.converted / workType.count) * 100) : 0,
          excelStatuses: workType.excelStatuses // Include actual Excel statuses
        });
      });
    });

    // Sort by advisor name and then by work type
    advisorWorkTypeBreakdown.sort((a, b) => {
      if (a.advisor !== b.advisor) {
        return a.advisor.localeCompare(b.advisor);
      }
      return a.workType.localeCompare(b.workType);
    });

    // Create traditional service advisor breakdown (for backward compatibility)
    const traditionalServiceAdvisorBreakdown = Object.values(serviceAdvisorBreakdown).map(advisor => ({
      advisor: advisor.advisor,
      count: advisor.count,
      converted: advisor.converted,
      processing: advisor.processing,
      tomorrow: advisor.tomorrow,
      future: advisor.future
    })).sort((a, b) => b.count - a.count);

    return {
      bookings: enhancedBookings,
      statusSummary: statusSummary,
      totalBookings: enhancedBookings.length,
      matchedVINs: enhancedBookings.filter(b => b.vin_matched).length,
      unmatchedVINs: enhancedBookings.filter(b => !b.vin_matched).length,
      serviceAdvisorBreakdown: advisorWorkTypeBreakdown,
      traditionalServiceAdvisorBreakdown: traditionalServiceAdvisorBreakdown
    };
    
  } catch (error) {
    console.error('❌ Error performing VIN matching:', error);
    throw error;
  }
};

/**
 * Parse booking date from various formats
 */
const parseBookingDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    // Handle Excel serial numbers
    const excelSerialMatch = dateString.toString().match(/^(\d+)(\.\d+)?$/);
    if (excelSerialMatch) {
      const serialNumber = parseFloat(dateString);
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      return new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
    }
    
    // Handle DD-MM-YYYY format
    const ddmmyyyyMatch = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Handle standard date parsing
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    
    return null;
  } catch (error) {
    console.warn('Date parsing error for:', dateString, error);
    return null;
  }
};

/**
 * Trigger VIN matching after BookingList upload
 */
export const triggerVINMatchingAfterBookingUpload = async (uploadedBy, city, showroom_id, advisorIdFilter = null) => {
  console.log(`🚀 Triggering VIN matching after BookingList upload`);
  return await performVINMatching(uploadedBy, city, showroom_id, advisorIdFilter);
};

/**
 * Trigger VIN matching after RepairOrderList upload
 */
export const triggerVINMatchingAfterRepairOrderUpload = async (uploadedBy, city, showroom_id, advisorIdFilter = null) => {
  console.log(`🚀 Triggering VIN matching after RepairOrderList upload`);
  return await performVINMatching(uploadedBy, city, showroom_id, advisorIdFilter);
};

export default {
  performVINMatching,
  getRepairOrderVINs,
  getBookingListVINs,
  triggerVINMatchingAfterBookingUpload,
  triggerVINMatchingAfterRepairOrderUpload
};
