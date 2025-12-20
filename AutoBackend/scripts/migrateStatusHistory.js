const mongoose = require('mongoose');
const CarService = require('../models/CarService');
require('dotenv').config();

/**
 * Migration script to add status history to existing records
 * This will initialize statusHistory for records that don't have it
 */
async function migrateStatusHistory() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-service-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all records that don't have statusHistory
    const servicesWithoutHistory = await CarService.find({
      $or: [
        { statusHistory: { $exists: false } },
        { statusHistory: { $size: 0 } }
      ]
    });

    console.log(`Found ${servicesWithoutHistory.length} services without status history`);

    // Update each record
    for (const service of servicesWithoutHistory) {
      const currentStatus = service.status || service.serviceStatus || 'inprogress';
      
      await CarService.findByIdAndUpdate(
        service._id,
        {
          $set: {
            statusHistory: [{
              status: currentStatus,
              changedAt: service.createdAt || new Date(),
              changedBy: 'System'
            }]
          }
        }
      );

      console.log(`Added status history for service ${service.vehicleRegistrationNumber}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateStatusHistory();
