import mongoose from "mongoose";

// Schema for storing metadata about uploaded CSV files
const uploadedFileMetaDetailsSchema = new mongoose.Schema({
  db_file_name: {
    type: String,
    required: true,
    unique: true
  },
  uploaded_file_name: {
    type: String,
    required: true
  },
  rows_count: {
    type: Number,
    required: true,
    min: 0
  },
  uploaded_by: {
    type: String,
    required: true
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  org_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  showroom_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  file_type: {
    type: String,
    enum: ["ro_billing", "warranty", "booking_list", "operations_part"],
    required: true
  },
  file_size: {
    type: Number
  },
  processing_status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending"
  },
  error_message: {
    type: String
  },
  file_hash: {
    type: String,
    required: true,
    index: true
  }
});

// Indexes for efficient querying
uploadedFileMetaDetailsSchema.index({ showroom_id: 1, uploaded_at: -1 });
uploadedFileMetaDetailsSchema.index({ uploaded_by: 1, uploaded_at: -1 });
uploadedFileMetaDetailsSchema.index({ file_type: 1, showroom_id: 1 });
uploadedFileMetaDetailsSchema.index({ processing_status: 1 });

const UploadedFileMetaDetails = mongoose.model("UploadedFileMetaDetails", uploadedFileMetaDetailsSchema);

export default UploadedFileMetaDetails;
