import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BookingListData from './models/BookingListData.js';
import UploadedFileMetaDetails from './models/UploadedFileMetaDetails.js';

dotenv.config();

async function cleanBookingData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    console.log('\n🧹 Cleaning up Booking List data with empty values...');
    
    // Find Booking records with empty customer names or other key fields
    const emptyRecords = await BookingListData.find({
      $or: [
        { customer_name: { $exists: false } },
        { customer_name: null },
        { customer_name: "" },
        { service_advisor: { $exists: false } },
        { service_advisor: null },
        { service_advisor: "" }
      ]
    });

    console.log(`📊 Found ${emptyRecords.length} Booking records with empty key fields`);

    if (emptyRecords.length > 0) {
      // Delete the records with empty key fields
      const deleteResult = await BookingListData.deleteMany({
        $or: [
          { customer_name: { $exists: false } },
          { customer_name: null },
          { customer_name: "" },
          { service_advisor: { $exists: false } },
          { service_advisor: null },
          { service_advisor: "" }
        ]
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} Booking records with empty key fields`);
    }

    // Clean up the associated file metadata
    const bookingFiles = await UploadedFileMetaDetails.find({ 
      file_type: 'booking_list'
    });

    console.log(`📊 Found ${bookingFiles.length} Booking List file uploads`);
    
    // Clean up file metadata for Booking List
    const fileDeleteResult = await UploadedFileMetaDetails.deleteMany({
      file_type: 'booking_list'
    });

    console.log(`✅ Deleted ${fileDeleteResult.deletedCount} Booking List file metadata records`);

    // Check current state
    console.log('\n📊 Current state after cleanup:');
    const bookingCount = await BookingListData.countDocuments();
    const bookingFileCount = await UploadedFileMetaDetails.countDocuments({ file_type: 'booking_list' });
    
    console.log(`   Booking List data records: ${bookingCount}`);
    console.log(`   Booking List file uploads: ${bookingFileCount}`);

    console.log('\n✅ Cleanup completed! You can now try uploading your Booking List file again with proper field mapping.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanBookingData();
