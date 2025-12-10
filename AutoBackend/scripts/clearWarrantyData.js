import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WarrantyData from '../models/WarrantyData.js';
import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';

// Load environment variables
dotenv.config();

/**
 * Clear all warranty data from database for fresh testing
 */
async function clearWarrantyData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Count existing records before deletion
    const warrantyCount = await WarrantyData.countDocuments();
    const warrantyFileCount = await UploadedFileMetaDetails.countDocuments({ file_type: 'warranty' });

    console.log(`📊 Current warranty data:`);
    console.log(`   Warranty records: ${warrantyCount}`);
    console.log(`   Warranty file uploads: ${warrantyFileCount}`);

    if (warrantyCount === 0 && warrantyFileCount === 0) {
      console.log('🎯 Database is already clean - no warranty data found');
      return;
    }

    // Ask for confirmation (in production, you might want to add a CLI prompt)
    console.log('\n🚨 WARNING: This will delete ALL warranty data!');
    console.log('   - All warranty records will be deleted');
    console.log('   - All warranty file upload metadata will be deleted');
    
    // Delete warranty data
    console.log('\n🗑️  Deleting warranty data...');
    
    const warrantyDeleteResult = await WarrantyData.deleteMany({});
    console.log(`✅ Deleted ${warrantyDeleteResult.deletedCount} warranty records`);

    const fileDeleteResult = await UploadedFileMetaDetails.deleteMany({ file_type: 'warranty' });
    console.log(`✅ Deleted ${fileDeleteResult.deletedCount} warranty file metadata records`);

    // Verify deletion
    const remainingWarranty = await WarrantyData.countDocuments();
    const remainingFiles = await UploadedFileMetaDetails.countDocuments({ file_type: 'warranty' });

    console.log('\n📊 After cleanup:');
    console.log(`   Warranty records: ${remainingWarranty}`);
    console.log(`   Warranty file uploads: ${remainingFiles}`);

    if (remainingWarranty === 0 && remainingFiles === 0) {
      console.log('\n🎉 SUCCESS: Warranty database cleared successfully!');
      console.log('📝 You can now test warranty uploads from scratch');
      console.log('   - Upload will be CASE_1_BRAND_NEW');
      console.log('   - All records will be inserted as new');
      console.log('   - claim_number will be used as unique field');
    } else {
      console.log('\n⚠️  WARNING: Some records may still remain');
    }

  } catch (error) {
    console.error('❌ Error clearing warranty data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
clearWarrantyData();
