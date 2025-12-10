import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';
import WarrantyData from './models/WarrantyData.js';
import BookingListData from './models/BookingListData.js';
import OperationsPartData from './models/OperationsPartData.js';

dotenv.config();

async function testDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Test collections
    console.log('\n📊 Checking collections...');
    
    const uploadedFiles = await UploadedFileMetaDetails.countDocuments();
    console.log(`📁 UploadedFileMetaDetails: ${uploadedFiles} documents`);
    
    const roBilling = await ROBillingData.countDocuments();
    console.log(`💰 ROBillingData: ${roBilling} documents`);
    
    const warranty = await WarrantyData.countDocuments();
    console.log(`🛡️ WarrantyData: ${warranty} documents`);
    
    const booking = await BookingListData.countDocuments();
    console.log(`📅 BookingListData: ${booking} documents`);
    
    const operations = await OperationsPartData.countDocuments();
    console.log(`🔧 OperationsPartData: ${operations} documents`);

    // List recent uploads
    console.log('\n📋 Recent uploads:');
    const recentUploads = await UploadedFileMetaDetails.find()
      .sort({ uploaded_at: -1 })
      .limit(5)
      .select('uploaded_file_name file_type rows_count processing_status uploaded_at');
    
    if (recentUploads.length > 0) {
      recentUploads.forEach(upload => {
        console.log(`  - ${upload.uploaded_file_name} (${upload.file_type}) - ${upload.rows_count} rows - ${upload.processing_status} - ${upload.uploaded_at}`);
      });
    } else {
      console.log('  No uploads found');
    }

    // Check database name
    console.log(`\n🗄️ Database name: ${mongoose.connection.db.databaseName}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📚 All collections:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testDatabase();
