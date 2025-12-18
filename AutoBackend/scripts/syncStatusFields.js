const mongoose = require('mongoose');
const CarService = require('../models/CarService');
require('dotenv').config();

/**
 * Migration script to sync status and serviceStatus fields
 * This will ensure both fields have the same value
 */
async function syncStatusFields() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-service-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all records that have mismatched status fields
    const servicesWithMismatchedStatus = await CarService.find({
      $expr: { $ne: ['$status', '$serviceStatus'] }
    });

    console.log(`Found ${servicesWithMismatchedStatus.length} services with mismatched status fields`);

    // Update each record
    for (const service of servicesWithMismatchedStatus) {
      const currentStatus = service.status || 'inprogress';
      
      await CarService.findByIdAndUpdate(
        service._id,
        {
          $set: {
            serviceStatus: currentStatus
          }
        }
      );

      console.log(`Synced status for service ${service.vehicleRegistrationNumber}: ${service.serviceStatus} -> ${currentStatus}`);
    }

    console.log('Status sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Status sync failed:', error);
    process.exit(1);
  }
}

syncStatusFields();
