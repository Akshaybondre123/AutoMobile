import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WarrantyData from './models/WarrantyData.js';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';

dotenv.config();

async function cleanFailedUploads() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Clean up failed warranty uploads
    console.log('\n🧹 Cleaning up failed warranty uploads...');
    
    const failedWarrantyFiles = await UploadedFileMetaDetails.find({ 
      file_type: 'warranty',
      processing_status: 'failed'
    });

    console.log(`📊 Found ${failedWarrantyFiles.length} failed warranty uploads`);

    if (failedWarrantyFiles.length > 0) {
      // Delete the failed file metadata records
      const deleteResult = await UploadedFileMetaDetails.deleteMany({
        file_type: 'warranty',
        processing_status: 'failed'
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} failed warranty file records`);

      // Also clean up any orphaned warranty data (just in case)
      const warrantyDeleteResult = await WarrantyData.deleteMany({
        uploaded_file_id: { $in: failedWarrantyFiles.map(f => f._id) }
      });

      console.log(`✅ Deleted ${warrantyDeleteResult.deletedCount} orphaned warranty data records`);
    }

    // Check current state
    console.log('\n📊 Current state after cleanup:');
    const warrantyCount = await WarrantyData.countDocuments();
    const warrantyFileCount = await UploadedFileMetaDetails.countDocuments({ file_type: 'warranty' });
    
    console.log(`   Warranty data records: ${warrantyCount}`);
    console.log(`   Warranty file uploads: ${warrantyFileCount}`);

    console.log('\n✅ Cleanup completed! You can now try uploading your warranty file again.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanFailedUploads();
