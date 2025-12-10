import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WarrantyData from './models/WarrantyData.js';

dotenv.config();

async function checkWarrantyData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Get a sample of warranty data to see what fields are populated
    console.log('\n📋 Checking warranty data structure...');
    const sampleData = await WarrantyData.find({}).limit(5);
    
    console.log(`Found ${sampleData.length} warranty records. Sample data:`);
    sampleData.forEach((record, index) => {
      console.log(`\n  Record ${index + 1}:`);
      console.log(`    RO_No: ${record.RO_No}`);
      console.log(`    claim_type: ${record.claim_type || 'NULL'}`);
      console.log(`    claim_status: ${record.claim_status || 'NULL'}`);
      console.log(`    labour_amount: ${record.labour_amount}`);
      console.log(`    part_amount: ${record.part_amount}`);
      console.log(`    total_claim_amount: ${record.total_claim_amount}`);
    });

    // Check all unique claim_type values
    console.log('\n🔍 Checking all unique claim_type values...');
    const claimTypes = await WarrantyData.distinct('claim_type');
    console.log(`Unique claim_type values: ${claimTypes.length > 0 ? claimTypes.join(', ') : 'NONE'}`);

    // Check all unique claim_status values
    console.log('\n📊 Checking all unique claim_status values...');
    const claimStatuses = await WarrantyData.distinct('claim_status');
    console.log(`Unique claim_status values: ${claimStatuses.length > 0 ? claimStatuses.join(', ') : 'NONE'}`);

    // Check if there are any non-zero amounts
    console.log('\n💰 Checking for non-zero amounts...');
    const nonZeroLabour = await WarrantyData.countDocuments({ labour_amount: { $gt: 0 } });
    const nonZeroPart = await WarrantyData.countDocuments({ part_amount: { $gt: 0 } });
    const nonZeroTotal = await WarrantyData.countDocuments({ total_claim_amount: { $gt: 0 } });
    
    console.log(`Records with labour_amount > 0: ${nonZeroLabour}`);
    console.log(`Records with part_amount > 0: ${nonZeroPart}`);
    console.log(`Records with total_claim_amount > 0: ${nonZeroTotal}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkWarrantyData();
