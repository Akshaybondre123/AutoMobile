import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import { getISTDate } from '../utils/dateUtils.js';

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    org_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: false
    },
    showroom_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Showroom',
      required: false
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    }
    ,
    user_password: {
      type: String,
      required: false,
      trim: true
    }
  },
  {
    timestamps: false
  }
);

userSchema.add({
  created_at: {
    type: Date,
    default: getISTDate
  },
  updated_at: {
    type: Date,
    default: getISTDate
  }
});

userSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  // Hash password when it's new or modified
  if (this.isModified && this.isModified('user_password') && this.user_password) {
    try {
      const salt = bcrypt.genSaltSync(10);
      this.user_password = bcrypt.hashSync(this.user_password, salt);
      next();
    } catch (err) {
      return next(err);
    }
  } else {
    next();
  }
});

// Compare provided password with hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.user_password) return false;
  return bcrypt.compare(candidatePassword, this.user_password);
};

// Index for faster queries (email and username already have unique indexes from schema)
userSchema.index({ org_id: 1 });

const User = mongoose.model("User", userSchema);

export default User;
