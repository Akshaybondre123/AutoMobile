import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';
import ROBillingData from '../models/ROBillingData.js';
import WarrantyData from '../models/WarrantyData.js';
import BookingListData from '../models/BookingListData.js';
import OperationsPartData from '../models/OperationsPartData.js';
import mongoose from 'mongoose';

/**
 * CSV Upload Service
 * Implements 3-case upload logic for all file types:
 * Case 1: Brand new file (no matching unique keys)
 * Case 2: Reupload with exact same unique keys
 * Case 3: Mixed file (some existing, some new unique keys)
 */

class CSVUploadService {
  
  /**
   * Get the appropriate model and unique key field based on file type
   */
  getModelConfig(fileType) {
    const configs = {
      'ro_billing': {
        model: ROBillingData,
        uniqueKey: 'RO_No',
        name: 'RO Billing'
      },
      'warranty': {
        model: WarrantyData,
        uniqueKey: 'RO_No',
        name: 'Warranty'
      },
      'booking_list': {
        model: BookingListData,
        uniqueKey: 'Reg_No',
        name: 'Booking List'
      },
      'operations_part': {
        model: OperationsPartData,
        uniqueKey: 'OP_Part_Code',
        name: 'Operations/Part'
      }
    };
    
    return configs[fileType];
  }

  /**
   * Create file metadata record
   */
  async createFileMetadata(fileData) {
    try {
      const metadata = new UploadedFileMetaDetails({
        db_file_name: fileData.db_file_name,
        uploaded_file_name: fileData.uploaded_file_name,
        rows_count: fileData.rows_count,
        uploaded_by: fileData.uploaded_by,
        org_id: fileData.org_id,
        showroom_id: fileData.showroom_id,
        file_type: fileData.file_type,
        file_size: fileData.file_size || 0,
        processing_status: 'processing'
      });
      
      const savedMetadata = await metadata.save();
      console.log(`✅ File metadata created: ${savedMetadata._id}`);
      return savedMetadata;
    } catch (error) {
      console.error('❌ Error creating file metadata:', error);
      throw error;
    }
  }

  /**
   * Update file metadata status
   */
  async updateFileMetadataStatus(fileId, status, errorMessage = null) {
    try {
      const updateData = { processing_status: status };
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }
      
      await UploadedFileMetaDetails.findByIdAndUpdate(fileId, updateData);
      console.log(`📊 File metadata updated: ${fileId} -> ${status}`);
    } catch (error) {
      console.error('❌ Error updating file metadata:', error);
    }
  }

  /**
   * Analyze CSV data to determine which case applies
   */
  async analyzeCSVData(csvRows, fileType, showroomId) {
    const config = this.getModelConfig(fileType);
    if (!config) {
      throw new Error(`Invalid file type: ${fileType}`);
    }

    const { model, uniqueKey } = config;
    
    // Extract unique keys from CSV
    const csvUniqueKeys = csvRows.map(row => row[uniqueKey]).filter(key => key);
    
    if (csvUniqueKeys.length === 0) {
      throw new Error(`No valid ${uniqueKey} found in CSV data`);
    }

    // Check which keys already exist in database
    const existingRecords = await model.find({
      [uniqueKey]: { $in: csvUniqueKeys },
      showroom_id: showroomId
    }).select(uniqueKey);

    const existingKeys = existingRecords.map(record => record[uniqueKey]);
    const newKeys = csvUniqueKeys.filter(key => !existingKeys.includes(key));

    console.log(`📊 Analysis for ${config.name}:`);
    console.log(`   Total CSV rows: ${csvRows.length}`);
    console.log(`   Unique keys in CSV: ${csvUniqueKeys.length}`);
    console.log(`   Existing keys: ${existingKeys.length}`);
    console.log(`   New keys: ${newKeys.length}`);

    // Determine case
    let uploadCase;
    if (existingKeys.length === 0) {
      uploadCase = 'CASE_1_BRAND_NEW';
    } else if (newKeys.length === 0) {
      uploadCase = 'CASE_2_EXACT_REUPLOAD';
    } else {
      uploadCase = 'CASE_3_MIXED';
    }

    return {
      uploadCase,
      existingKeys,
      newKeys,
      csvUniqueKeys,
      totalRows: csvRows.length
    };
  }

  /**
   * Process CSV data based on the determined case
   */
  async processCSVData(csvRows, fileMetadata, analysis) {
    const config = this.getModelConfig(fileMetadata.file_type);
    const { model, uniqueKey } = config;
    const { uploadCase, existingKeys, newKeys } = analysis;

    console.log(`🚀 Processing ${uploadCase} for ${config.name}`);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let insertedCount = 0;
      let updatedCount = 0;

      switch (uploadCase) {
        case 'CASE_1_BRAND_NEW':
          insertedCount = await this.handleCase1BrandNew(csvRows, fileMetadata, model, session);
          break;
          
        case 'CASE_2_EXACT_REUPLOAD':
          updatedCount = await this.handleCase2ExactReupload(csvRows, fileMetadata, model, uniqueKey, session);
          break;
          
        case 'CASE_3_MIXED':
          const result = await this.handleCase3Mixed(csvRows, fileMetadata, model, uniqueKey, existingKeys, newKeys, session);
          insertedCount = result.insertedCount;
          updatedCount = result.updatedCount;
          break;
      }

      await session.commitTransaction();
      
      console.log(`✅ Processing completed:`);
      console.log(`   Inserted: ${insertedCount} rows`);
      console.log(`   Updated: ${updatedCount} rows`);

      return { insertedCount, updatedCount };
      
    } catch (error) {
      await session.abortTransaction();
      console.error(`❌ Error processing ${uploadCase}:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * CASE 1: Brand new file - insert all rows
   */
  async handleCase1BrandNew(csvRows, fileMetadata, model, session) {
    console.log('📝 CASE 1: Inserting all rows as new records');
    
    const documentsToInsert = csvRows.map(row => ({
      ...row,
      uploaded_file_id: fileMetadata._id,
      showroom_id: fileMetadata.showroom_id,
      created_at: new Date(),
      updated_at: new Date()
    }));

    const result = await model.insertMany(documentsToInsert, { session });
    return result.length;
  }

  /**
   * CASE 2: Exact reupload - update all existing rows
   */
  async handleCase2ExactReupload(csvRows, fileMetadata, model, uniqueKey, session) {
    console.log('🔄 CASE 2: Updating all existing rows');
    
    let updatedCount = 0;
    
    for (const row of csvRows) {
      const updateData = {
        ...row,
        uploaded_file_id: fileMetadata._id,
        updated_at: new Date()
      };
      
      // Remove the unique key from update data to avoid conflicts
      delete updateData[uniqueKey];
      
      const result = await model.updateOne(
        {
          [uniqueKey]: row[uniqueKey],
          showroom_id: fileMetadata.showroom_id
        },
        { $set: updateData },
        { session }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  /**
   * CASE 3: Mixed file - update existing, insert new
   */
  async handleCase3Mixed(csvRows, fileMetadata, model, uniqueKey, existingKeys, newKeys, session) {
    console.log('🔀 CASE 3: Mixed processing - updating existing and inserting new');
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Separate rows into existing and new
    const existingRows = csvRows.filter(row => existingKeys.includes(row[uniqueKey]));
    const newRows = csvRows.filter(row => newKeys.includes(row[uniqueKey]));
    
    // Update existing rows
    for (const row of existingRows) {
      const updateData = {
        ...row,
        uploaded_file_id: fileMetadata._id,
        updated_at: new Date()
      };
      
      delete updateData[uniqueKey];
      
      const result = await model.updateOne(
        {
          [uniqueKey]: row[uniqueKey],
          showroom_id: fileMetadata.showroom_id
        },
        { $set: updateData },
        { session }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }
    
    // Insert new rows
    if (newRows.length > 0) {
      const documentsToInsert = newRows.map(row => ({
        ...row,
        uploaded_file_id: fileMetadata._id,
        showroom_id: fileMetadata.showroom_id,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const result = await model.insertMany(documentsToInsert, { session });
      insertedCount = result.length;
    }
    
    return { insertedCount, updatedCount };
  }

  /**
   * Main upload method - orchestrates the entire process
   */
  async uploadCSV(fileData, csvRows) {
    console.log(`🎯 Starting CSV upload for ${fileData.file_type}`);
    console.log(`   File: ${fileData.uploaded_file_name}`);
    console.log(`   Rows: ${csvRows.length}`);
    console.log(`   Showroom: ${fileData.showroom_id}`);
    
    let fileMetadata;
    
    try {
      // Step 1: Create file metadata
      fileMetadata = await this.createFileMetadata(fileData);
      
      // Step 2: Analyze CSV data to determine case
      const analysis = await this.analyzeCSVData(csvRows, fileData.file_type, fileData.showroom_id);
      
      // Step 3: Process data based on case
      const result = await this.processCSVData(csvRows, fileMetadata, analysis);
      
      // Step 4: Update metadata status to completed
      await this.updateFileMetadataStatus(fileMetadata._id, 'completed');
      
      console.log(`🎉 CSV upload completed successfully!`);
      
      return {
        success: true,
        fileId: fileMetadata._id,
        uploadCase: analysis.uploadCase,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        totalProcessed: result.insertedCount + result.updatedCount,
        message: `Successfully processed ${result.insertedCount + result.updatedCount} rows using ${analysis.uploadCase}`
      };
      
    } catch (error) {
      console.error('❌ CSV upload failed:', error);
      
      if (fileMetadata) {
        await this.updateFileMetadataStatus(fileMetadata._id, 'failed', error.message);
      }
      
      return {
        success: false,
        error: error.message,
        fileId: fileMetadata?._id
      };
    }
  }

  /**
   * Get upload history for a showroom
   */
  async getUploadHistory(showroomId, fileType = null, limit = 50) {
    try {
      const query = { showroom_id: showroomId };
      if (fileType) {
        query.file_type = fileType;
      }
      
      const history = await UploadedFileMetaDetails
        .find(query)
        .sort({ uploaded_at: -1 })
        .limit(limit)
        .lean();
      
      return history;
    } catch (error) {
      console.error('❌ Error fetching upload history:', error);
      throw error;
    }
  }

  /**
   * Get detailed upload statistics
   */
  async getUploadStats(showroomId, fileType = null) {
    try {
      const matchStage = { showroom_id: new mongoose.Types.ObjectId(showroomId) };
      if (fileType) {
        matchStage.file_type = fileType;
      }
      
      const stats = await UploadedFileMetaDetails.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$file_type',
            totalFiles: { $sum: 1 },
            totalRows: { $sum: '$rows_count' },
            successfulUploads: {
              $sum: { $cond: [{ $eq: ['$processing_status', 'completed'] }, 1, 0] }
            },
            failedUploads: {
              $sum: { $cond: [{ $eq: ['$processing_status', 'failed'] }, 1, 0] }
            },
            lastUpload: { $max: '$uploaded_at' }
          }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('❌ Error fetching upload stats:', error);
      throw error;
    }
  }
}

export default new CSVUploadService();
