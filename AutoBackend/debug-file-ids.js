import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';

dotenv.config();

async function debugFileIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Get upload metadata
    console.log('\n📋 Checking upload metadata...');
    const uploads = await UploadedFileMetaDetails.find({ 
      uploaded_by: 'sm.nagpur@shubh.com',
      file_type: 'ro_billing'
    }).select('_id uploaded_file_name rows_count');
    
    console.log(`Found ${uploads.length} upload metadata records:`);
    uploads.forEach((upload, index) => {
      console.log(`  ${index + 1}. ID: ${upload._id}, File: ${upload.uploaded_file_name}, Rows: ${upload.rows_count}`);
    });

    // Check RO Billing data
    console.log('\n💰 Checking ROBillingData records...');
    const roData = await ROBillingData.find({}).select('uploaded_file_id RO_No').limit(5);
    console.log(`Found ${roData.length} RO Billing records (showing first 5):`);
    roData.forEach((ro, index) => {
      console.log(`  ${index + 1}. uploaded_file_id: ${ro.uploaded_file_id}, RO_No: ${ro.RO_No}`);
    });

    // Check if file IDs match
    console.log('\n🔍 Checking file ID matches...');
    const uploadIds = uploads.map(u => u._id.toString());
    const roFileIds = [...new Set(roData.map(ro => ro.uploaded_file_id.toString()))];
    
    console.log('Upload IDs:', uploadIds);
    console.log('RO File IDs:', roFileIds);
    
    const matches = uploadIds.filter(id => roFileIds.includes(id));
    console.log(`Matching IDs: ${matches.length}/${uploadIds.length}`);
    
    if (matches.length === 0) {
      console.log('❌ No matching file IDs found! This explains why no data is returned.');
    } else {
      console.log('✅ File IDs match correctly');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

debugFileIds();
