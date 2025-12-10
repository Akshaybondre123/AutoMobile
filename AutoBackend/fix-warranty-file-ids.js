import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';
import WarrantyData from './models/WarrantyData.js';

dotenv.config();

async function fixWarrantyFileIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Find the warranty upload file
    console.log('\n📋 Looking for warranty upload...');
    let warrantyUpload = await UploadedFileMetaDetails.findOne({ file_type: 'warranty' });
    
    if (!warrantyUpload) {
      console.log('❌ No warranty upload found, creating one...');
      
      // Create a warranty upload record
      warrantyUpload = new UploadedFileMetaDetails({
        db_file_name: 'warranty_sample.xlsx',
        uploaded_file_name: 'WarrantyClaimList (35).xlsx',
        rows_count: 260,
        uploaded_by: 'sm.pune@shubh.com',
        org_id: new mongoose.Types.ObjectId('64f8a1b2c3d4e5f6a7b8c9d0'),
        showroom_id: new mongoose.Types.ObjectId('64f8a1b2c3d4e5f6a7b8c9d1'),
        file_type: 'warranty',
        file_size: 15000,
        processing_status: 'completed',
        uploaded_at: new Date()
      });
      
      await warrantyUpload.save();
      console.log(`✅ Created warranty upload with ID: ${warrantyUpload._id}`);
    } else {
      console.log(`✅ Found warranty upload: ${warrantyUpload.uploaded_file_name} (ID: ${warrantyUpload._id})`);
    }

    // Update all warranty data to use this upload ID
    console.log('\n🔄 Updating warranty data file IDs...');
    const updateResult = await WarrantyData.updateMany(
      {}, // Update all warranty records
      { uploaded_file_id: warrantyUpload._id }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} warranty records with correct file ID`);

    // Verify the fix
    const warrantyCount = await WarrantyData.countDocuments({ uploaded_file_id: warrantyUpload._id });
    console.log(`✅ Verification: Found ${warrantyCount} warranty records with correct file ID`);

    // Test the aggregation
    const warrantyTotals = await WarrantyData.aggregate([
      { $match: { uploaded_file_id: warrantyUpload._id } },
      { $group: { 
        _id: null, 
        totalClaimAmount: { $sum: '$total_claim_amount' },
        totalLabourAmount: { $sum: '$labour_amount' },
        totalPartAmount: { $sum: '$part_amount' }
      }}
    ]);

    if (warrantyTotals.length > 0) {
      console.log(`✅ Warranty totals: Claim: ₹${warrantyTotals[0].totalClaimAmount.toLocaleString()}, Labour: ₹${warrantyTotals[0].totalLabourAmount.toLocaleString()}, Parts: ₹${warrantyTotals[0].totalPartAmount.toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixWarrantyFileIds();
