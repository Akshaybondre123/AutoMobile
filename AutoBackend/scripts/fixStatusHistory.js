const mongoose = require('mongoose');
const CarService = require('../models/CarService');
require('dotenv').config();

/**
 * Migration script to fix status history enum values
 * This will convert any invalid enum values to valid lowercase ones
 */
async function fixStatusHistory() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car-service-management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all services with status history
    const services = await CarService.find({ statusHistory: { $exists: true, $ne: [] } });

    console.log(`Found ${services.length} services with status history`);

    // Status mapping from invalid to valid values
    const statusMapping = {
      'Completed': 'completed',
      'In Progress': 'inprogress',
      'Total Loss': 'total-loss',
      'Major Repair': 'major-repair',
      'Medium Repair': 'medium-repair',
      'Minor Repair': 'minor-repair'
    };

    for (const service of services) {
      let needsUpdate = false;
      const updatedHistory = service.statusHistory.map(entry => {
        const originalStatus = entry.status;
        const normalizedStatus = statusMapping[entry.status] || entry.status.toLowerCase().replace(/\s+/g, '-');
        
        if (originalStatus !== normalizedStatus) {
          console.log(`Fixing status: ${originalStatus} -> ${normalizedStatus} for service ${service.vehicleRegistrationNumber}`);
          needsUpdate = true;
          return {
            ...entry.toObject(),
            status: normalizedStatus
          };
        }
        return entry;
      });

      if (needsUpdate) {
        await CarService.findByIdAndUpdate(
          service._id,
          {
            $set: { statusHistory: updatedHistory }
          }
        );
      }
    }

    console.log('Status history fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Status history fix failed:', error);
    process.exit(1);
  }
}

fixStatusHistory();
