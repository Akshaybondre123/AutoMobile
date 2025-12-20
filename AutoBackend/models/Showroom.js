import mongoose from 'mongoose';
import { getISTDate } from '../utils/dateUtils.js';

const showroomSchema = new mongoose.Schema({
  showroom_city: { type: String, trim: true },
  showroom_address: { type: String, trim: true },
  org_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true }
}, {
  timestamps: false
});

showroomSchema.add({
  created_at: { type: Date, default: getISTDate },
  updated_at: { type: Date, default: getISTDate }
});

showroomSchema.pre('save', function(next) {
  this.updated_at = getISTDate();
  next();
});

showroomSchema.index({ org_id: 1 });

const Showroom = mongoose.model('Showroom', showroomSchema);
export default Showroom;
