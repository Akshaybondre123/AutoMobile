import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WarrantyData from './models/WarrantyData.js';

dotenv.config();

async function addSampleWarrantyData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Sample warranty claim types and statuses
    const claimTypes = ['Engine', 'Transmission', 'Electrical', 'Brake System', 'Suspension', 'Air Conditioning', 'Paint/Body'];
    const claimStatuses = ['Approved', 'Pending', 'Rejected', 'Under Review'];

    console.log('\n📋 Adding sample warranty data...');
    
    // Get all warranty records
    const warrantyRecords = await WarrantyData.find({});
    console.log(`Found ${warrantyRecords.length} warranty records to update`);

    let updatedCount = 0;

    for (const record of warrantyRecords) {
      // Randomly assign claim type and status
      const randomClaimType = claimTypes[Math.floor(Math.random() * claimTypes.length)];
      const randomStatus = claimStatuses[Math.floor(Math.random() * claimStatuses.length)];
      
      // Generate realistic amounts (some records will have 0, some will have amounts)
      const hasAmount = Math.random() > 0.3; // 70% chance of having amounts
      
      let labourAmount = 0;
      let partAmount = 0;
      let totalClaimAmount = 0;
      
      if (hasAmount) {
        labourAmount = Math.floor(Math.random() * 5000) + 500; // 500-5500
        partAmount = Math.floor(Math.random() * 8000) + 200;   // 200-8200
        totalClaimAmount = labourAmount + partAmount;
      }

      // Update the record
      await WarrantyData.findByIdAndUpdate(record._id, {
        claim_type: randomClaimType,
        claim_status: randomStatus,
        labour_amount: labourAmount,
        part_amount: partAmount,
        total_claim_amount: totalClaimAmount,
        approved_amount: randomStatus === 'Approved' ? totalClaimAmount : 0
      });

      updatedCount++;
      
      if (updatedCount % 50 === 0) {
        console.log(`Updated ${updatedCount}/${warrantyRecords.length} records...`);
      }
    }

    console.log(`✅ Updated ${updatedCount} warranty records with sample data`);

    // Show summary of what was added
    console.log('\n📊 Summary of added data:');
    const typeBreakdown = await WarrantyData.aggregate([
      { $group: { 
        _id: '$claim_type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$total_claim_amount' }
      }},
      { $sort: { count: -1 } }
    ]);

    typeBreakdown.forEach(item => {
      console.log(`  ${item._id}: ${item.count} claims, ₹${item.totalAmount.toLocaleString()}`);
    });

    const statusBreakdown = await WarrantyData.aggregate([
      { $group: { 
        _id: '$claim_status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$total_claim_amount' }
      }},
      { $sort: { count: -1 } }
    ]);

    console.log('\n📈 Status breakdown:');
    statusBreakdown.forEach(item => {
      console.log(`  ${item._id}: ${item.count} claims, ₹${item.totalAmount.toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

addSampleWarrantyData();
