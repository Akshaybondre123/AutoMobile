import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';

dotenv.config();

async function fixAllFileIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Check all upload metadata
    console.log('\n📋 Checking all upload metadata...');
    const allUploads = await UploadedFileMetaDetails.find({ 
      file_type: 'ro_billing'
    }).select('_id uploaded_by uploaded_file_name rows_count').sort({ uploaded_at: -1 });
    
    console.log(`Found ${allUploads.length} upload metadata records:`);
    allUploads.forEach((upload, index) => {
      console.log(`  ${index + 1}. ID: ${upload._id}, User: ${upload.uploaded_by}, File: ${upload.uploaded_file_name}, Rows: ${upload.rows_count}`);
    });

    if (allUploads.length === 0) {
      console.log('❌ No upload metadata found');
      return;
    }

    // Get the latest upload (most recent)
    const latestUpload = allUploads[0];
    console.log(`\n🎯 Using latest upload: ${latestUpload.uploaded_file_name} (ID: ${latestUpload._id})`);

    // Count all RO Billing records
    const totalRoRecords = await ROBillingData.countDocuments();
    console.log(`💰 Total RO Billing records: ${totalRoRecords}`);

    // Update ALL RO Billing records to use the latest upload ID
    const updateResult = await ROBillingData.updateMany(
      {}, // Update all records regardless of current file ID
      { uploaded_file_id: latestUpload._id }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} RO Billing records with latest file ID`);

    // Verify the fix for both users
    const users = ['sm.nagpur@shubh.com', 'sm.pune@shubh.com'];
    
    for (const userEmail of users) {
      console.log(`\n🔍 Checking data for ${userEmail}:`);
      
      // Get upload metadata for this user
      const userUploads = await UploadedFileMetaDetails.find({ 
        uploaded_by: userEmail,
        file_type: 'ro_billing'
      });
      
      if (userUploads.length > 0) {
        const fileIds = userUploads.map(f => f._id);
        const roCount = await ROBillingData.countDocuments({ uploaded_file_id: { $in: fileIds } });
        console.log(`  📊 Found ${roCount} RO Billing records for ${userEmail}`);
        
        if (roCount > 0) {
          const sampleRecord = await ROBillingData.findOne({ uploaded_file_id: { $in: fileIds } });
          console.log(`  📝 Sample: RO_No: ${sampleRecord.RO_No}, Total: ${sampleRecord.total_amount}`);
        }
      } else {
        console.log(`  ⚠️ No upload metadata found for ${userEmail}`);
        
        // Create upload metadata for this user using the latest upload
        const newUpload = new UploadedFileMetaDetails({
          uploaded_by: userEmail,
          uploaded_file_name: latestUpload.uploaded_file_name,
          file_type: 'ro_billing',
          rows_count: totalRoRecords,
          processing_status: 'completed',
          uploaded_at: new Date()
        });
        
        await newUpload.save();
        console.log(`  ✅ Created upload metadata for ${userEmail} (ID: ${newUpload._id})`);
        
        // Update records to use this new upload ID for this user's data
        await ROBillingData.updateMany(
          {},
          { uploaded_file_id: newUpload._id }
        );
        
        console.log(`  ✅ Updated records to use new upload ID for ${userEmail}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixAllFileIds();
