import mongoose from 'mongoose';

/**
 * Car Service Schema for managing car service records
 * Stores all relevant information about vehicle services
 */
const carServiceSchema = new mongoose.Schema({
  vehicleRegistrationNumber: {
    type: String,
    required: [true, 'Vehicle registration number is required'],
    trim: true,
    uppercase: true
  },
  vehicleModel: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  typeOfWork: {
    type: String,
    required: [true, 'Type of work is required'],
    enum: ['Total Loss', 'Major Repair', 'Medium Repair', 'Minor Repair']
  },
  serviceAdvisorId: {
    type: String,
    required: [true, 'Service advisor ID is required'],
    trim: true
  },
  serviceDate: {
    type: Date,
    required: [true, 'Service date is required'],
    default: Date.now
  },
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true
  },
  contactInfo: {
    type: String,
    required: [true, 'Contact information is required'],
    trim: true
  },
  roDate: {
    type: Date,
    default: null
  },
  roNumber: {
    type: String,
    default: null,
    trim: true
  },
  TAT: {
    type: Number,
    default: 0
  },
  tatActiveSince: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    // enum: [
    //   'insurance-approval-pending',
    //   'insurance-survey-pending', 
    //   'claim-intimation-pending',
    //   'parts-order-pending',
    //   'parts-order',
    //   'painting',
    //   'denting',
    //   'dismantling',
    //   're-inspection',
    //   'fitting-polishing',
    //   'insurance-liability-pending',
    //   'kept-open',
    //   'done',
    //   'inprogress',
    //   'completed'
    // ],
    default: 'inprogress'
  },
  serviceStatus: {
    type: String,
    // enum: [
    //   'insurance-approval-pending',
    //   'insurance-survey-pending', 
    //   'claim-intimation-pending',
    //   'parts-order-pending',
    //   'parts-order',
    //   'painting',
    //   'denting',
    //   'dismantling',
    //   're-inspection',
    //   'fitting-polishing',
    //   'insurance-liability-pending',
    //   'kept-open',
    //   'done',
    //   'inprogress',
    //   'completed'
    // ],
    default: 'inprogress'
  },
  statusHistory: {
    type: [{
      status: {
        type: String,
        enum: [
          'insurance-approval-pending',
          'insurance-survey-pending', 
          'claim-intimation-pending',
          'parts-order-pending',
          'parts-order',
          'painting',
          'denting',
          'dismantling',
          're-inspection',
          'fitting-polishing',
          'insurance-liability-pending',
          'kept-open',
          'done',
          'inprogress',
          'completed'
        ],
        required: true
      },
      changedAt: {
        type: Date,
        default: Date.now,
        required: true
      },
      changedBy: {
        type: String,
        default: 'System',
        required: true
      }
    }],
    default: []
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for efficient queries
carServiceSchema.index({ serviceAdvisorId: 1, serviceDate: -1 });
carServiceSchema.index({ vehicleRegistrationNumber: 1 });

// Virtual for formatted service date
carServiceSchema.virtual('formattedServiceDate').get(function() {
  return this.serviceDate.toLocaleDateString();
});

// Ensure virtuals are included in JSON output
carServiceSchema.set('toJSON', { virtuals: true });
carServiceSchema.set('toObject', { virtuals: true });

const CarService = mongoose.model('CarService', carServiceSchema);

export default CarService;
