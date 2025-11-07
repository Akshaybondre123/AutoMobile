import mongoose from "mongoose";

// Schema for RO Billing data
const roBillingSchema = new mongoose.Schema({
  billDate: String,
  serviceAdvisor: String,
  labourAmt: Number,
  partAmt: Number,
  workType: String,
  roNumber: String,
  vehicleNumber: String,
  customerName: String,
  totalAmount: Number,
});

// Schema for Operations data (Operation Wise Analysis)
const operationsSchema = new mongoose.Schema({
  opPartDescription: String, // OP/Part Desc.
  count: Number,
  amount: Number,
});

// Schema for Warranty Claim data
const warrantySchema = new mongoose.Schema({
  claimDate: String,
  claimType: String,
  status: String,
  labour: Number,
  part: Number,
  claimNumber: String,
  vehicleNumber: String,
  customerName: String,
});

// Schema for Service Booking data (Booking List)
const serviceBookingSchema = new mongoose.Schema({
  serviceAdvisor: String,
  btDateTime: String, // B.T Date & Time
  workType: String,
  status: String,
  bookingNumber: String,
  vehicleNumber: String,
  customerName: String,
});

// Main upload schema that stores metadata and references to data
const serviceManagerUploadSchema = new mongoose.Schema({
  uploadedBy: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  uploadType: {
    type: String,
    enum: ["ro_billing", "operations", "warranty", "service_booking"],
    required: true,
  },
  fileName: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  startDate: String,
  endDate: String,
  totalRows: Number,
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
  },
});

// Create indexes for efficient querying
serviceManagerUploadSchema.index({ uploadedBy: 1, city: 1, uploadType: 1 });
serviceManagerUploadSchema.index({ uploadDate: -1 });

const ServiceManagerUpload = mongoose.model("ServiceManagerUpload", serviceManagerUploadSchema);

export default ServiceManagerUpload;
