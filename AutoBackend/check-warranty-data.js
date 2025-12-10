import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WarrantyData from './models/WarrantyData.js';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';

dotenv.config();

async function checkWarrantyData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Check warranty data
    console.log('\n🛡️ Checking WarrantyData collection...');
    const warrantyCount = await WarrantyData.countDocuments();
    console.log(`📊 Total warranty records: ${warrantyCount}`);

    if (warrantyCount > 0) {
      console.log('\n📋 Existing warranty records:');
      const warrantyRecords = await WarrantyData.find()
        .limit(10)
        .select('RO_No showroom_id uploaded_file_id created_at');
      
      warrantyRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. RO_No: ${record.RO_No}, Showroom: ${record.showroom_id}, Created: ${record.created_at}`);
      });

      // Check for the specific duplicate
      const duplicateRecord = await WarrantyData.findOne({
        RO_No: "R202509424",
        showroom_id: new mongoose.Types.ObjectId('64f8a1b2c3d4e5f6a7b8c9d1')
      });

      if (duplicateRecord) {
        console.log('\n🔍 Found the duplicate record:');
        console.log('   RO_No:', duplicateRecord.RO_No);
        console.log('   Showroom ID:', duplicateRecord.showroom_id);
        console.log('   Created:', duplicateRecord.created_at);
        console.log('   File ID:', duplicateRecord.uploaded_file_id);
      }
    }

    // Check warranty file uploads
    console.log('\n📁 Checking warranty file uploads...');
    const warrantyFiles = await UploadedFileMetaDetails.find({ file_type: 'warranty' });
    console.log(`📊 Total warranty file uploads: ${warrantyFiles.length}`);

    if (warrantyFiles.length > 0) {
      console.log('\n📋 Warranty file uploads:');
      warrantyFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.uploaded_file_name} - ${file.rows_count} rows - ${file.processing_status} - ${file.uploaded_at}`);
      });
    }

    // Offer to clean up
    console.log('\n🧹 Would you like to clean up existing warranty data?');
    console.log('   This will delete all warranty records and file metadata.');
    console.log('   Run: node clean-warranty-data.js');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkWarrantyData();
