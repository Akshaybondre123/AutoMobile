import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WarrantyData from './models/WarrantyData.js';

dotenv.config();

async function rebuildIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    console.log('\n🔧 Rebuilding WarrantyData indexes...');
    
    // Drop existing indexes (except _id)
    try {
      await WarrantyData.collection.dropIndexes();
      console.log('✅ Dropped existing indexes');
    } catch (error) {
      console.log('ℹ️ No indexes to drop or error dropping:', error.message);
    }

    // Ensure indexes are created
    await WarrantyData.ensureIndexes();
    console.log('✅ Recreated indexes');

    // List current indexes
    const indexes = await WarrantyData.collection.listIndexes().toArray();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Check for any existing data that might conflict
    const existingCount = await WarrantyData.countDocuments();
    console.log(`\n📊 Existing warranty records: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️ Found existing warranty data. Checking for duplicates...');
      
      const duplicates = await WarrantyData.aggregate([
        {
          $group: {
            _id: { RO_No: "$RO_No", showroom_id: "$showroom_id" },
            count: { $sum: 1 },
            docs: { $push: "$_id" }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      if (duplicates.length > 0) {
        console.log(`❌ Found ${duplicates.length} duplicate groups. Cleaning up...`);
        
        for (const duplicate of duplicates) {
          // Keep the first document, delete the rest
          const docsToDelete = duplicate.docs.slice(1);
          await WarrantyData.deleteMany({ _id: { $in: docsToDelete } });
          console.log(`   Removed ${docsToDelete.length} duplicate records for RO_No: ${duplicate._id.RO_No}`);
        }
      } else {
        console.log('✅ No duplicates found');
      }
    }

    console.log('\n✅ Index rebuild completed! You can now try uploading your warranty file.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

rebuildIndexes();
