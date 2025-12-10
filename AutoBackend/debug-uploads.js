import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';

dotenv.config();

async function debugUploads() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Check what uploaded_by values exist
    console.log('\n📋 Checking uploaded_by values in UploadedFileMetaDetails...');
    const uploads = await UploadedFileMetaDetails.find({}).select('uploaded_by file_type rows_count uploaded_at');
    
    console.log(`Found ${uploads.length} uploads:`);
    uploads.forEach((upload, index) => {
      console.log(`  ${index + 1}. uploaded_by: "${upload.uploaded_by}", file_type: ${upload.file_type}, rows: ${upload.rows_count}, date: ${upload.uploaded_at}`);
    });

    // Check unique uploaded_by values
    const uniqueUploaders = [...new Set(uploads.map(u => u.uploaded_by))];
    console.log(`\n📊 Unique uploaded_by values: ${uniqueUploaders.join(', ')}`);

    // Check RO Billing data
    console.log('\n💰 Checking ROBillingData...');
    const roData = await ROBillingData.find({}).limit(3).select('uploaded_file_id RO_No total_amount');
    console.log(`Found ${roData.length} RO records (showing first 3):`);
    roData.forEach((ro, index) => {
      console.log(`  ${index + 1}. uploaded_file_id: ${ro.uploaded_file_id}, RO_No: ${ro.RO_No}, total_amount: ${ro.total_amount}`);
    });

    // Test the dashboard query logic
    console.log('\n🔍 Testing dashboard query logic...');
    const testEmail = uniqueUploaders[0]; // Use the first uploader email
    console.log(`Testing with email: "${testEmail}"`);

    const fileQuery = { uploaded_by: testEmail };
    const testUploads = await UploadedFileMetaDetails.find(fileQuery);
    console.log(`Found ${testUploads.length} uploads for email: "${testEmail}"`);

    if (testUploads.length > 0) {
      const fileIds = testUploads.map(f => f._id);
      const roCount = await ROBillingData.countDocuments({ uploaded_file_id: { $in: fileIds } });
      console.log(`Found ${roCount} RO Billing records for these uploads`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

debugUploads();
