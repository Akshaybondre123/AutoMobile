import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';

dotenv.config();

async function fixFileIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Get the latest upload metadata
    const latestUpload = await UploadedFileMetaDetails.findOne({ 
      uploaded_by: 'sm.nagpur@shubh.com',
      file_type: 'ro_billing'
    }).sort({ uploaded_at: -1 });

    if (!latestUpload) {
      console.log('❌ No upload metadata found');
      return;
    }

    console.log(`📋 Latest upload: ${latestUpload.uploaded_file_name} (ID: ${latestUpload._id})`);

    // Count RO Billing records
    const totalRoRecords = await ROBillingData.countDocuments();
    console.log(`💰 Total RO Billing records: ${totalRoRecords}`);

    // Update all RO Billing records to use the latest upload ID
    const updateResult = await ROBillingData.updateMany(
      {}, // Update all records
      { uploaded_file_id: latestUpload._id }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} RO Billing records with correct file ID`);

    // Verify the fix
    const sampleRecords = await ROBillingData.find({ uploaded_file_id: latestUpload._id }).limit(3);
    console.log(`✅ Verification: Found ${sampleRecords.length} records with correct file ID`);
    
    if (sampleRecords.length > 0) {
      console.log(`Sample record: RO_No: ${sampleRecords[0].RO_No}, Total: ${sampleRecords[0].total_amount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixFileIds();
