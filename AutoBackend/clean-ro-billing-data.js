import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ROBillingData from './models/ROBillingData.js';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';

dotenv.config();

async function cleanROBillingData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    console.log('\n🧹 Cleaning up RO Billing data with zero values...');
    
    // Find RO Billing records with all zero amounts
    const zeroRecords = await ROBillingData.find({
      $and: [
        { labour_amt: 0 },
        { part_amt: 0 },
        { total_amount: 0 }
      ]
    });

    console.log(`📊 Found ${zeroRecords.length} RO Billing records with zero amounts`);

    if (zeroRecords.length > 0) {
      // Delete the records with zero amounts
      const deleteResult = await ROBillingData.deleteMany({
        $and: [
          { labour_amt: 0 },
          { part_amt: 0 },
          { total_amount: 0 }
        ]
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} RO Billing records with zero amounts`);

      // Also clean up the associated file metadata
      const roBillingFiles = await UploadedFileMetaDetails.find({ 
        file_type: 'ro_billing'
      });

      console.log(`📊 Found ${roBillingFiles.length} RO Billing file uploads`);
      
      // Clean up file metadata for RO Billing
      const fileDeleteResult = await UploadedFileMetaDetails.deleteMany({
        file_type: 'ro_billing'
      });

      console.log(`✅ Deleted ${fileDeleteResult.deletedCount} RO Billing file metadata records`);
    }

    // Check current state
    console.log('\n📊 Current state after cleanup:');
    const roBillingCount = await ROBillingData.countDocuments();
    const roBillingFileCount = await UploadedFileMetaDetails.countDocuments({ file_type: 'ro_billing' });
    
    console.log(`   RO Billing data records: ${roBillingCount}`);
    console.log(`   RO Billing file uploads: ${roBillingFileCount}`);

    console.log('\n✅ Cleanup completed! You can now try uploading your RO Billing file again with proper field mapping.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanROBillingData();
