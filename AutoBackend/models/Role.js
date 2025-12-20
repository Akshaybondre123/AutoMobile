import mongoose from "mongoose";
import { getISTDate } from '../utils/dateUtils.js';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    desc: {
      type: String,
      trim: true
    },
    showroom_id: {
      type: String,
      required: true,
      trim: true,
      // Read default showroom id from environment to avoid hardcoded values
      default: process.env.DEFAULT_SHOWROOM_ID
    },
    created_at: {
      type: Date,
      default: getISTDate
    },
    updated_at: {
      type: Date,
      default: getISTDate
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
  }
);

// Create compound unique index for name + showroom_id
roleSchema.index({ name: 1, showroom_id: 1 }, { unique: true });

// Index for faster queries (name already has unique index from schema)

const Role = mongoose.model("Role", roleSchema);

export default Role;
