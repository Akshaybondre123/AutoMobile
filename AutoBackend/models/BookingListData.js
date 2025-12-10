import mongoose from "mongoose";

// Schema for storing Booking List CSV data
const bookingListDataSchema = new mongoose.Schema({
  uploaded_file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UploadedFileMetaDetails',
    required: true
  },
  Reg_No: {
    type: String,
    required: true
  },
  showroom_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Booking List specific fields
  service_advisor: String,
  bt_date_time: String, // B.T Date & Time
  bt_number: String, // B.T No
  work_type: String,
  booking_status: String,
  booking_number: String,
  customer_name: String,
  vin_number: String,
  pickup_required: String,
  express_care: String,
  hyper_local_service: String,
  
  // Additional booking fields
  appointment_date: String,
  appointment_time: String,
  estimated_completion: String,
  service_type: String,
  vehicle_model: String,
  vehicle_make: String,
  vehicle_year: String,
  vehicle_color: String,
  mileage: String,
  customer_phone: String,
  customer_email: String,
  customer_address: String,
  
  // Service details
  requested_services: [String],
  estimated_cost: {
    type: Number,
    default: 0
  },
  estimated_labour_hours: {
    type: Number,
    default: 0
  },
  priority_level: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  
  // Booking source and notes
  booking_source: String, // walk-in, phone, online, etc.
  special_instructions: String,
  internal_notes: String,
  
  // Status tracking
  confirmation_status: String,
  reminder_sent: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index: Reg_No must be unique within each showroom
bookingListDataSchema.index({ Reg_No: 1, showroom_id: 1 }, { unique: true });

// Additional indexes for efficient querying
bookingListDataSchema.index({ uploaded_file_id: 1 });
bookingListDataSchema.index({ showroom_id: 1, bt_date_time: -1 });
bookingListDataSchema.index({ service_advisor: 1, showroom_id: 1 });
bookingListDataSchema.index({ booking_number: 1, showroom_id: 1 });
bookingListDataSchema.index({ booking_status: 1, showroom_id: 1 });
bookingListDataSchema.index({ appointment_date: 1, showroom_id: 1 });
bookingListDataSchema.index({ created_at: -1 });

// Update the updated_at field before saving
bookingListDataSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const BookingListData = mongoose.model("BookingListData", bookingListDataSchema);

export default BookingListData;
