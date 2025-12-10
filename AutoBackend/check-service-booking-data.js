import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BookingListData from './models/BookingListData.js';

dotenv.config();

async function checkServiceBookingData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Get a sample of booking data to see what fields are populated
    console.log('\n📋 Checking service booking data structure...');
    const sampleData = await BookingListData.find({}).limit(5);
    
    console.log(`Found ${sampleData.length} service booking records. Sample data:`);
    sampleData.forEach((record, index) => {
      console.log(`\n  Record ${index + 1}:`);
      console.log(`    Reg_No: ${record.Reg_No}`);
      console.log(`    customer_name: ${record.customer_name || 'NULL'}`);
      console.log(`    service_advisor: ${record.service_advisor || 'NULL'}`);
      console.log(`    work_type: ${record.work_type || 'NULL'}`);
      console.log(`    status: ${record.status || 'NULL'}`);
      console.log(`    booking_date: ${record.booking_date || 'NULL'}`);
      console.log(`    service_date: ${record.service_date || 'NULL'}`);
    });

    // Check all unique service_advisor values
    console.log('\n👨‍💼 Checking all unique service_advisor values...');
    const serviceAdvisors = await BookingListData.distinct('service_advisor');
    console.log(`Unique service_advisor values: ${serviceAdvisors.length > 0 ? serviceAdvisors.join(', ') : 'NONE'}`);

    // Check all unique work_type values
    console.log('\n🔧 Checking all unique work_type values...');
    const workTypes = await BookingListData.distinct('work_type');
    console.log(`Unique work_type values: ${workTypes.length > 0 ? workTypes.join(', ') : 'NONE'}`);

    // Check all unique status values
    console.log('\n📊 Checking all unique status values...');
    const statuses = await BookingListData.distinct('status');
    console.log(`Unique status values: ${statuses.length > 0 ? statuses.join(', ') : 'NONE'}`);

    // Get total count
    const totalCount = await BookingListData.countDocuments();
    console.log(`\n📈 Total service booking records: ${totalCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkServiceBookingData();
