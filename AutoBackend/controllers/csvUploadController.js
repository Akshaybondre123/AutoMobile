import csvUploadService from '../services/csvUploadService.js';
import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';
import ROBillingData from '../models/ROBillingData.js';
import WarrantyData from '../models/WarrantyData.js';
import BookingListData from '../models/BookingListData.js';
import OperationsPartData from '../models/OperationsPartData.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

/**
 * CSV Upload Controller
 * Handles all CSV upload related API endpoints
 */

/**
 * Parse CSV file and return rows as JSON
 */
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return reject(new Error('CSV file is empty'));
      }
      
      // Parse header row
      const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
      
      // Parse data rows
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
        
        if (values.length === headers.length) {
          const row = {};
          headers.forEach((header, index) => {
            if (values[index] && values[index] !== '') {
              row[header] = values[index];
            }
          });
          
          if (Object.keys(row).length > 0) {
            results.push(row);
          }
        }
      }
      
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Validate required fields based on file type
 */
const validateCSVData = (csvRows, fileType) => {
  if (!csvRows || csvRows.length === 0) {
    throw new Error('CSV file is empty or contains no valid data');
  }

  const requiredFields = {
    'ro_billing': ['RO_No'],
    'warranty': ['RO_No'],
    'booking_list': ['Reg_No'],
    'operations_part': ['OP_Part_Code']
  };

  const required = requiredFields[fileType];
  if (!required) {
    throw new Error(`Invalid file type: ${fileType}`);
  }

  // Check if required fields exist in the first row
  const firstRow = csvRows[0];
  const missingFields = required.filter(field => !(field in firstRow));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required columns: ${missingFields.join(', ')}`);
  }

  // Check for empty required fields
  const rowsWithEmptyRequired = csvRows.filter(row => 
    required.some(field => !row[field] || row[field].toString().trim() === '')
  );

  if (rowsWithEmptyRequired.length > 0) {
    throw new Error(`Found ${rowsWithEmptyRequired.length} rows with empty required fields`);
  }

  return true;
};

/**
 * POST /api/csv/upload
 * Upload and process CSV file
 */
export const uploadCSV = async (req, res) => {
  try {
    console.log('🎯 CSV Upload Request Received');
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }

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

    console.log(`📁 Processing ${file_type} file: ${req.file.originalname}`);

    // Parse CSV file
    const csvRows = await parseCSVFile(req.file.path);
    console.log(`📊 Parsed ${csvRows.length} rows from CSV`);

    // Validate CSV data
    validateCSVData(csvRows, file_type);

    // Prepare file metadata
    const fileData = {
      db_file_name: req.file.filename,
      uploaded_file_name: req.file.originalname,
      rows_count: csvRows.length,
      uploaded_by,
      org_id: new mongoose.Types.ObjectId(org_id),
      showroom_id: new mongoose.Types.ObjectId(showroom_id),
      file_type,
      file_size: req.file.size
    };

    // Process CSV upload using service
    const result = await csvUploadService.uploadCSV(fileData, csvRows);

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
          rowsCount: csvRows.length
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
    console.error('❌ CSV Upload Error:', error);
    
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
      error: error.message || 'Internal server error during CSV upload'
    });
  }
};

/**
 * GET /api/csv/history/:showroomId
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

    const history = await csvUploadService.getUploadHistory(
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
 * GET /api/csv/stats/:showroomId
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

    const stats = await csvUploadService.getUploadStats(
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
 * GET /api/csv/file/:fileId
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
 * DELETE /api/csv/file/:fileId
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
