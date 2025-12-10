import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';

dotenv.config();

async function fixWarrantyUploadUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Find the warranty upload
    console.log('\n📋 Finding warranty upload...');
    const warrantyUpload = await UploadedFileMetaDetails.findOne({ file_type: 'warranty' });
    
    if (!warrantyUpload) {
      console.log('❌ No warranty upload found');
      return;
    }

    console.log(`Found warranty upload: ${warrantyUpload.uploaded_file_name}`);
    console.log(`Current uploaded_by: ${warrantyUpload.uploaded_by}`);

    // Update the warranty upload to use the Pune user
    const updateResult = await UploadedFileMetaDetails.findByIdAndUpdate(
      warrantyUpload._id,
      { 
        uploaded_by: 'sm.pune@shubh.com',
        uploaded_at: new Date() // Update timestamp to make it appear recent
      },
      { new: true }
    );

    console.log(`✅ Updated warranty upload uploaded_by to: ${updateResult.uploaded_by}`);

    // Verify by checking uploads for the Pune user
    console.log('\n🔍 Checking uploads for sm.pune@shubh.com...');
    const puneUploads = await UploadedFileMetaDetails.find({ 
      uploaded_by: 'sm.pune@shubh.com' 
    }).select('file_type uploaded_file_name uploaded_at');

    console.log(`Found ${puneUploads.length} uploads for sm.pune@shubh.com:`);
    puneUploads.forEach(upload => {
      console.log(`  - ${upload.file_type}: ${upload.uploaded_file_name} (${upload.uploaded_at})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixWarrantyUploadUser();
