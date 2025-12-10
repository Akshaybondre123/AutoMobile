import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OperationsPartData from './models/OperationsPartData.js';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';

dotenv.config();

async function cleanOperationsData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Clean up failed operations uploads
    console.log('\n🧹 Cleaning up failed operations uploads...');
    
    const failedOperationsFiles = await UploadedFileMetaDetails.find({ 
      file_type: 'operations_part',
      processing_status: 'failed'
    });

    console.log(`📊 Found ${failedOperationsFiles.length} failed operations uploads`);

    if (failedOperationsFiles.length > 0) {
      // Delete the failed file metadata records
      const deleteResult = await UploadedFileMetaDetails.deleteMany({
        file_type: 'operations_part',
        processing_status: 'failed'
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} failed operations file records`);

      // Also clean up any orphaned operations data
      const operationsDeleteResult = await OperationsPartData.deleteMany({
        uploaded_file_id: { $in: failedOperationsFiles.map(f => f._id) }
      });

      console.log(`✅ Deleted ${operationsDeleteResult.deletedCount} orphaned operations data records`);
    }

    // Check for problematic records with OP_Part_Code = "0"
    console.log('\n🔍 Checking for problematic OP_Part_Code values...');
    const problematicRecords = await OperationsPartData.find({
      $or: [
        { OP_Part_Code: "0" },
        { OP_Part_Code: "" },
        { OP_Part_Code: null },
        { OP_Part_Code: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${problematicRecords.length} records with invalid OP_Part_Code`);

    if (problematicRecords.length > 0) {
      console.log('🗑️ Cleaning up invalid OP_Part_Code records...');
      const cleanupResult = await OperationsPartData.deleteMany({
        $or: [
          { OP_Part_Code: "0" },
          { OP_Part_Code: "" },
          { OP_Part_Code: null },
          { OP_Part_Code: { $exists: false } }
        ]
      });
      console.log(`✅ Deleted ${cleanupResult.deletedCount} invalid records`);
    }

    // Check current state
    console.log('\n📊 Current state after cleanup:');
    const operationsCount = await OperationsPartData.countDocuments();
    const operationsFileCount = await UploadedFileMetaDetails.countDocuments({ file_type: 'operations_part' });
    
    console.log(`   Operations data records: ${operationsCount}`);
    console.log(`   Operations file uploads: ${operationsFileCount}`);

    console.log('\n✅ Cleanup completed! You can now try uploading your operations file again.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanOperationsData();
