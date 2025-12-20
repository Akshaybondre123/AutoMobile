import mongoose from "mongoose";
import { getISTDate } from '../utils/dateUtils.js';

const rolePermissionMappingSchema = new mongoose.Schema(
  {
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true
    },
    permission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true
    },
    showroom_id: {
      type: String,
      required: true,
      trim: true,
      // Read default showroom id from environment to avoid hardcoded values
      default: process.env.DEFAULT_SHOWROOM_ID
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
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

// Compound index to ensure unique role-permission-showroom combinations
rolePermissionMappingSchema.index({ role_id: 1, permission_id: 1, showroom_id: 1 }, { unique: true });
rolePermissionMappingSchema.index({ role_id: 1 });
rolePermissionMappingSchema.index({ permission_id: 1 });

const RolePermissionMapping = mongoose.model("RolePermissionMapping", rolePermissionMappingSchema);

export default RolePermissionMapping;
