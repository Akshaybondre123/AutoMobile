import excelUploadService from '../services/excelUploadService.js';
import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';
import ROBillingData from '../models/ROBillingData.js';
import WarrantyData from '../models/WarrantyData.js';
import BookingListData from '../models/BookingListData.js';
import OperationsPartData from '../models/OperationsPartData.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import XLSX from 'xlsx';

/**
 * Excel Upload Controller
 * Handles all Excel upload related API endpoints
 */

/**
 * Parse Excel file and return rows as JSON
 */
const parseExcelFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return reject(new Error('Excel file contains no worksheets'));
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use array of arrays format first
        defval: '', // Default value for empty cells
        blankrows: false // Skip blank rows
      });
      
      if (jsonData.length === 0) {
        return reject(new Error('Excel file is empty'));
      }
      
      // Get headers from first row
      const headers = jsonData[0].map(header => 
        header ? header.toString().trim() : ''
      ).filter(header => header !== '');
      
      if (headers.length === 0) {
        return reject(new Error('No valid headers found in Excel file'));
      }
      
      // Convert data rows to objects
      const results = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowObject = {};
        let hasData = false;
        
        headers.forEach((header, index) => {
          const cellValue = row[index];
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            // Convert to string and trim
            rowObject[header] = cellValue.toString().trim();
            hasData = true;
          }
        });
        
        // Only add rows that have at least one non-empty cell
        if (hasData && Object.keys(rowObject).length > 0) {
          results.push(rowObject);
        }
      }
      
      console.log(`📊 Parsed Excel file: ${results.length} data rows, ${headers.length} columns`);
      console.log(`📋 Headers: ${headers.join(', ')}`);
      
      resolve(results);
    } catch (error) {
      console.error('❌ Error parsing Excel file:', error);
      reject(new Error(`Failed to parse Excel file: ${error.message}`));
    }
  });
};

/**
 * Map common column name variations to standardized field names
 */
const mapColumnNames = (excelRows, fileType) => {
  if (!excelRows || excelRows.length === 0) {
    return excelRows;
  }

  const columnMappings = {
    'ro_billing': {
      'R/O No': 'RO_No',
      'RO No': 'RO_No',
      'RO_No': 'RO_No',
      'RO Number': 'RO_No',
      'Vehicle Reg No': 'vehicle_number',
      'Vehicle_Reg_No': 'vehicle_number',
      'Vehicle Number': 'vehicle_number',
      'Customer Name': 'customer_name',
      'Customer_Name': 'customer_name',
      'Labour Amt': 'labour_amt',
      'Labour_Amt': 'labour_amt',
      'Labour Cost': 'labour_amt',
      'Part Amt': 'part_amt',
      'Part_Amt': 'part_amt',
      'Parts Cost': 'part_amt',
      'Total Amt': 'total_amount',
      'Total_Amt': 'total_amount',
      'Total Amount': 'total_amount',
      'Bill Date': 'bill_date',
      'Bill_Date': 'bill_date',
      'Service Advisor': 'service_advisor',
      'Service_Advisor': 'service_advisor',
      'Technician': 'technician_name',
      'Techniciar': 'technician_name', // Handle typo in your Excel
      'Work Type': 'work_type',
      'Work_Type': 'work_type',
      'Dis. Amt': 'discount_amount',
      'Discount Amount': 'discount_amount',
      'Round Off': 'round_off_amount',
      'Service Tax on Mechanical Labour': 'service_tax',
      'VAT on Bodyshop Labour': 'vat_amount',
      'Labour Tax': 'labour_tax',
      'Part Tax': 'part_tax',
      'Other Amt': 'other_amount'
    },
    'warranty': {
      'R/O No': 'RO_No',
      'RO No': 'RO_No',
      'RO_No': 'RO_No',
      'RO Number': 'RO_No',
      'Claim Type': 'claim_type',
      'Claim_Type': 'claim_type',
      'Type': 'claim_type',
      'Status': 'claim_status',
      'status': 'claim_status',  // Added lowercase 'status' mapping
      'Claim Status': 'claim_status',
      'Claim_Status': 'claim_status',
      'claim status': 'claim_status',
      'claim_status': 'claim_status',
      'Warranty Status': 'claim_status',
      'warranty status': 'claim_status',
      'Labour': 'labour_amount',
      'Labour Amount': 'labour_amount',
      'Labour_Amount': 'labour_amount',
      'Labor Amount': 'labour_amount',
      'Part': 'part_amount',
      'part': 'part_amount',  // Added lowercase 'part' mapping
      'Part Amount': 'part_amount',
      'Part_Amount': 'part_amount',
      'Parts Amount': 'part_amount',
      'Parts': 'part_amount',
      'parts': 'part_amount',
      'Claim Date': 'claim_date',
      'Claim_Date': 'claim_date',
      'Date': 'claim_date',
      'Claim Number': 'claim_number',
      'Claim_Number': 'claim_number',
      'Claim No': 'claim_number',
      'Vehicle Number': 'vehicle_number',
      'Vehicle_Number': 'vehicle_number',
      'Vehicle No': 'vehicle_number',
      'Customer Name': 'customer_name',
      'Customer_Name': 'customer_name',
      'Total Claim Amount': 'total_claim_amount',
      'Total_Claim_Amount': 'total_claim_amount',
      'Total Amount': 'total_claim_amount',
      'Approved Amount': 'approved_amount',
      'Approved_Amount': 'approved_amount'
    },
    'booking_list': {
      'Vehicle Reg No': 'Reg_No',
      'Vehicle_Reg_No': 'Reg_No',
      'Reg No': 'Reg_No',
      'Reg. No': 'Reg_No',
      'Registration No': 'Reg_No',
      'Customer Name': 'customer_name',
      'Customer_Name': 'customer_name',
      'Customer': 'customer_name',  
      'No.': 'booking_number',    
      'Booking Number': 'booking_number',
      'Service Advisor': 'service_advisor',
      'B.T Date & Time': 'bt_date_time',
      'B.T No': 'bt_number',
      'Work Type': 'work_type',
      'Booking Status': 'booking_status',
      'Status': 'booking_status',
      'Booking_Status': 'booking_status',
      'Service Status': 'booking_status',
      'Current Status': 'booking_status',
      'VIN Number': 'vin_number',
      'Pickup Required': 'pickup_required',
      'Express Care': 'express_care',
      'Hyper Local Service': 'hyper_local_service',
      'Reminder Sent': 'reminder_sent',
      'Hyper Local': 'hyper_local_service'
    },
    'operations_part': {
      'OP/Part Code': 'OP_Part_Code',  
      'OP Part Code': 'OP_Part_Code',
      'OP_Part_Code': 'OP_Part_Code',
      'Part Code': 'OP_Part_Code',
      'Operation Code': 'OP_Part_Code',
      'Total': 'OP_Part_Code',  // Fallback option
      'Santro': 'Santro_Count',
      'Getz': 'Getz_Count',
      'Accent': 'Accent_Count',
      'Elantra': 'Elantra_Count',
      'NF-Sonata': 'NF_Sonata_Count',
      'E.F.Sonata': 'EF_Sonata_Count',
      'Tucsan': 'Tucsan_Count',
      'Terracan': 'Terracan_Count',
      'i10': 'i10_Count',
      'i20': 'i20_Count',
      'Verna': 'Verna_Count',
      'New Santro': 'New_Santro_Count',
      'Next Gen Verna': 'Next_Gen_Verna_Count',
      'Venue': 'Venue_Count',
      'Grand i10 NIOS': 'Grand_i10_NIOS_Count',
      'New Creta': 'New_Creta_Count',
      'New i20': 'New_i20_Count',
      'Elite i20': 'Elite_i20_Count',
      'Xcent': 'Xcent_Count',
      'Other': 'Other_Count',
      'Total in operation': 'Total_Operation_Count'
    }
  };

  const mappings = columnMappings[fileType] || {};
  
  return excelRows.map(row => {
    const mappedRow = {};
    
    Object.keys(row).forEach(originalKey => {
      const mappedKey = mappings[originalKey] || originalKey;
      let value = row[originalKey];
      
      // Convert Boolean fields for booking_list
      if (fileType === 'booking_list' && mappedKey === 'reminder_sent') {
        // Convert "Y"/"N" strings to boolean
        if (typeof value === 'string') {
          value = value.toUpperCase() === 'Y' || value.toUpperCase() === 'YES' || value === '1' || value === 'TRUE';
        }
      }
      
      // Convert numeric fields for warranty
      if (fileType === 'warranty' && ['labour_amount', 'part_amount', 'total_claim_amount', 'approved_amount'].includes(mappedKey)) {
        // Convert string numbers to actual numbers
        if (typeof value === 'string' && value.trim() !== '') {
          const numValue = parseFloat(value.replace(/[^\d.-]/g, '')); // Remove non-numeric characters except decimal and minus
          value = isNaN(numValue) ? 0 : numValue;
        } else if (value === '' || value === null || value === undefined) {
          value = 0;
        }
      }
      
      mappedRow[mappedKey] = value;
    });
    
    return mappedRow;
  });
};

/**
 * Validate required fields based on file type
 */
const validateExcelData = (excelRows, fileType) => {
  if (!excelRows || excelRows.length === 0) {
    throw new Error('Excel file is empty or contains no valid data');
  }

  const requiredFields = {
    'ro_billing': ['RO_No'],
    'warranty': ['claim_number'],  // Changed from RO_No to claim_number to handle duplicates
    'booking_list': ['Reg_No'],
    'operations_part': ['OP_Part_Code']  // This will be mapped from 'Total' column
  };

  const required = requiredFields[fileType];
  if (!required) {
    throw new Error(`Invalid file type: ${fileType}`);
  }

  // Check if required fields exist in the first row
  const firstRow = excelRows[0];
  const availableFields = Object.keys(firstRow);
  const missingFields = required.filter(field => !availableFields.includes(field));
  
  if (missingFields.length > 0) {
    console.log(`📋 Available columns: ${availableFields.join(', ')}`);
    console.log(`❌ Missing required columns: ${missingFields.join(', ')}`);
    throw new Error(`Missing required columns: ${missingFields.join(', ')}. Available columns: ${availableFields.join(', ')}`);
  }

  // Check for empty or invalid required fields
  const rowsWithEmptyRequired = excelRows.filter(row => {
    return required.some(field => {
      const value = row[field];
      if (!value || value.toString().trim() === '') {
        return true; // Empty value
      }
      
      // Special validation for OP_Part_Code - reject "0" as it's not a valid code
      if (field === 'OP_Part_Code' && (value === '0' || value === 0)) {
        return true; // Invalid OP_Part_Code
      }
      
      return false;
    });
  });

  // Note: Duplicate validation removed - ExcelUploadService handles duplicates by updating existing records
  // This allows for proper upsert behavior like RO Billing system
  const uniqueKeyField = required[0]; // First required field is always the unique key
  
  console.log(`📊 Excel validation passed for ${uniqueKeyField} field`);
  console.log(`   Total rows to process: ${excelRows.length}`);

  // Check for empty/invalid fields and reject if found
  if (rowsWithEmptyRequired.length > 0) {
    console.log(`❌ Found ${rowsWithEmptyRequired.length} rows with empty or invalid required fields`);
    throw new Error(`Excel file contains ${rowsWithEmptyRequired.length} rows with empty or invalid ${uniqueKeyField} values. Please fix these rows and try again.`);
  }

  console.log(`✅ Excel data validation passed for ${fileType}`);
  return true;
};

/**
 * POST /api/excel/upload
 * Upload and process Excel file
 */
export const uploadExcel = async (req, res) => {
  try {
    console.log('🎯 Excel Upload Request Received');
    console.log('📋 Request body:', req.body);
    console.log('📁 Request file:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        error: 'No Excel file uploaded'
      });
    }

    console.log(`📁 Uploaded file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Extract metadata from request body
    const {
      file_type,
      uploaded_by,
      org_id,
      showroom_id
    } = req.body;

    // Validate required metadata
    if (!file_type || !uploaded_by || !org_id || !showroom_id) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: file_type, uploaded_by, org_id, showroom_id'
      });
    }

    // Validate file type
    const validFileTypes = ['ro_billing', 'warranty', 'booking_list', 'operations_part'];
    if (!validFileTypes.includes(file_type)) {
      fs.unlinkSync(req.file.path);
      
      return res.status(400).json({
        success: false,
        error: `Invalid file_type. Must be one of: ${validFileTypes.join(', ')}`
      });
    }

    console.log(`📊 Processing ${file_type} file: ${req.file.originalname}`);

    // Parse Excel file
    let excelRows = await parseExcelFile(req.file.path);
    console.log(`📈 Parsed ${excelRows.length} rows from Excel`);

    // Map column names to standardized format
    excelRows = mapColumnNames(excelRows, file_type);
    console.log(`🔄 Applied column name mapping for ${file_type}`);

    // Validate Excel data
    validateExcelData(excelRows, file_type);

    // Prepare file metadata
    const fileData = {
      db_file_name: req.file.filename,
      uploaded_file_name: req.file.originalname,
      rows_count: excelRows.length,
      uploaded_by,
      org_id: new mongoose.Types.ObjectId(org_id),
      showroom_id: new mongoose.Types.ObjectId(showroom_id),
      file_type,
      file_size: req.file.size
    };

    // Process Excel upload using service
    const result = await excelUploadService.uploadExcel(fileData, excelRows);

    // Clean up uploaded file after processing
    try {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up temporary file:', cleanupError.message);
    }

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          fileId: result.fileId,
          uploadCase: result.uploadCase,
          insertedCount: result.insertedCount,
          updatedCount: result.updatedCount,
          totalProcessed: result.totalProcessed,
          fileName: req.file.originalname,
          fileType: file_type,
          rowsCount: excelRows.length
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        fileId: result.fileId
      });
    }

  } catch (error) {
    console.error('❌ Excel Upload Error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temporary file:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during Excel upload'
    });
  }
};

/**
 * GET /api/excel/history/:showroomId
 * Get upload history for a showroom
 */
export const getUploadHistory = async (req, res) => {
  try {
    const { showroomId } = req.params;
    const { fileType, limit } = req.query;

    if (!mongoose.Types.ObjectId.isValid(showroomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid showroom ID'
      });
    }

    const history = await excelUploadService.getUploadHistory(
      new mongoose.Types.ObjectId(showroomId),
      fileType,
      parseInt(limit) || 50
    );

    res.status(200).json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    console.error('❌ Error fetching upload history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching upload history'
    });
  }
};

/**
 * GET /api/excel/stats/:showroomId
 * Get upload statistics for a showroom
 */
export const getUploadStats = async (req, res) => {
  try {
    const { showroomId } = req.params;
    const { fileType } = req.query;

    if (!mongoose.Types.ObjectId.isValid(showroomId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid showroom ID'
      });
    }

    const stats = await excelUploadService.getUploadStats(
      new mongoose.Types.ObjectId(showroomId),
      fileType
    );

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching upload stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching upload statistics'
    });
  }
};

/**
 * GET /api/excel/file/:fileId
 * Get detailed information about a specific uploaded file
 */
export const getFileDetails = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID'
      });
    }

    const fileDetails = await UploadedFileMetaDetails.findById(fileId);

    if (!fileDetails) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.status(200).json({
      success: true,
      data: fileDetails
    });

  } catch (error) {
    console.error('❌ Error fetching file details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching file details'
    });
  }
};

/**
 * DELETE /api/excel/file/:fileId
 * Delete an uploaded file and optionally its associated data
 */
export const deleteUploadedFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { deleteData } = req.query; // boolean flag

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID'
      });
    }

    // Get file details first
    const fileDetails = await UploadedFileMetaDetails.findById(fileId);
    if (!fileDetails) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let deletedDataCount = 0;

      // Delete associated data if requested
      if (deleteData === 'true') {
        const models = {
          'ro_billing': ROBillingData,
          'warranty': WarrantyData,
          'booking_list': BookingListData,
          'operations_part': OperationsPartData
        };

        const model = models[fileDetails.file_type];
        if (model) {
          const deleteResult = await model.deleteMany(
            { uploaded_file_id: fileId },
            { session }
          );
          deletedDataCount = deleteResult.deletedCount;
        }
      }

      // Delete file metadata
      await UploadedFileMetaDetails.findByIdAndDelete(fileId, { session });

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: `File deleted successfully. ${deletedDataCount} data records removed.`,
        deletedDataCount
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error deleting file'
    });
  }
};
