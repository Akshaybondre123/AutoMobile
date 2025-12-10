import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import ROBillingData from './models/ROBillingData.js';

dotenv.config();

async function testDirectInsert() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Test direct insert to UploadedFileMetaDetails
    console.log('\n📁 Testing UploadedFileMetaDetails insert...');
    const fileMetadata = new UploadedFileMetaDetails({
      db_file_name: 'test-file-123.xlsx',
      uploaded_file_name: 'test-ro-billing.xlsx',
      rows_count: 3,
      uploaded_by: 'test@example.com',
      org_id: new mongoose.Types.ObjectId('64f8a1b2c3d4e5f6a7b8c9d0'),
      showroom_id: new mongoose.Types.ObjectId('64f8a1b2c3d4e5f6a7b8c9d1'),
      file_type: 'ro_billing',
      file_size: 1024,
      processing_status: 'completed'
    });

    const savedFile = await fileMetadata.save();
    console.log('✅ File metadata saved:', savedFile._id);

    // Test direct insert to ROBillingData
    console.log('\n💰 Testing ROBillingData insert...');
    const roBillingRecord = new ROBillingData({
      uploaded_file_id: savedFile._id,
      RO_No: 'RO001',
      Vehicle_Number: 'MH12AB1234',
      Customer_Name: 'John Doe',
      Labour_Cost: 1500,
      Parts_Cost: 2500,
      Total_Amount: 4000,
      Status: 'completed',
      showroom_id: new mongoose.Types.ObjectId('64f8a1b2c3d4e5f6a7b8c9d1')
    });

    const savedRecord = await roBillingRecord.save();
    console.log('✅ RO Billing record saved:', savedRecord._id);

    // Verify the data
    console.log('\n🔍 Verifying saved data...');
    const fileCount = await UploadedFileMetaDetails.countDocuments();
    const roCount = await ROBillingData.countDocuments();
    
    console.log(`📁 UploadedFileMetaDetails count: ${fileCount}`);
    console.log(`💰 ROBillingData count: ${roCount}`);

    // Fetch and display the records
    const files = await UploadedFileMetaDetails.find().limit(5);
    const records = await ROBillingData.find().limit(5);

    console.log('\n📋 Recent file uploads:');
    files.forEach(file => {
      console.log(`  - ${file.uploaded_file_name} (${file.file_type}) - ${file.rows_count} rows - ${file.processing_status}`);
    });

    console.log('\n📋 Recent RO Billing records:');
    records.forEach(record => {
      console.log(`  - ${record.RO_No} - ${record.Customer_Name} - ₹${record.Total_Amount}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testDirectInsert();
