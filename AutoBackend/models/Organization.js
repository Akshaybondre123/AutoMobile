import mongoose from 'mongoose';
import { getISTDate } from '../utils/dateUtils.js';

const organizationSchema = new mongoose.Schema({
  owner_name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: false
});

organizationSchema.add({
  created_at: { type: Date, default: getISTDate },
  updated_at: { type: Date, default: getISTDate }
});

organizationSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  next();
});

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
