import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Advisor Mapping Service
 * Maps service advisor names to User IDs for linking bookings to advisors
 */
class AdvisorMappingService {
  /**
   * Normalize advisor name for matching
   * Removes extra spaces, converts to lowercase, trims
   */
  normalizeAdvisorName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Find advisor User by name and showroom_id
   * First tries exact match, then normalized match
   * If not found, returns null (don't auto-create users)
   * IMPORTANT: showroom_id is required to ensure advisors are mapped to correct showroom
   */
  async findAdvisorByName(advisorName, showroomId) {
    if (!advisorName || !advisorName.trim()) {
      return null;
    }

    if (!showroomId) {
      console.warn(`⚠️ showroom_id is required for advisor mapping: "${advisorName}"`);
      return null;
    }

    try {
      const showroomObjectId = new mongoose.Types.ObjectId(showroomId);
      
      // First try exact match (case-insensitive) within the showroom
      let advisor = await User.findOne({
        name: { $regex: new RegExp(`^${advisorName.trim()}$`, 'i') },
        showroom_id: showroomObjectId
      });

      if (advisor) {
        console.log(`✅ Found advisor by exact match: "${advisorName}" -> ${advisor._id} (showroom: ${showroomId})`);
        return { advisorId: advisor._id, showroomId: advisor.showroom_id };
      }

      // Try normalized match within the showroom
      const normalizedName = this.normalizeAdvisorName(advisorName);
      const allUsers = await User.find({
        showroom_id: showroomObjectId
      }).select('_id name showroom_id');

      for (const user of allUsers) {
        const userNormalizedName = this.normalizeAdvisorName(user.name);
        if (userNormalizedName === normalizedName) {
          console.log(`✅ Found advisor by normalized match: "${advisorName}" -> ${user._id} (showroom: ${showroomId})`);
          return { advisorId: user._id, showroomId: user.showroom_id };
        }
      }

      console.log(`⚠️ Advisor not found: "${advisorName}" (showroom: ${showroomId})`);
      return null;
    } catch (error) {
      console.error(`❌ Error finding advisor "${advisorName}":`, error);
      return null;
    }
  }

  /**
   * Batch map advisor names to User IDs with showroom_id
   * Returns a map of advisor name -> { advisorId, showroomId }
   * IMPORTANT: showroom_id is included to ensure proper data isolation
   */
  async batchMapAdvisors(advisorNames, showroomId) {
    const mapping = {};
    const uniqueNames = [...new Set(advisorNames.filter(name => name && name.trim()))];

    if (!showroomId) {
      console.warn(`⚠️ showroom_id is required for batch mapping advisors`);
      return mapping;
    }

    console.log(`🔍 Batch mapping ${uniqueNames.length} unique advisor names for showroom: ${showroomId}...`);

    for (const advisorName of uniqueNames) {
      const result = await this.findAdvisorByName(advisorName, showroomId);
      if (result && result.advisorId) {
        mapping[advisorName] = {
          advisorId: result.advisorId,
          showroomId: result.showroomId || showroomId
        };
      }
    }

    console.log(`✅ Mapped ${Object.keys(mapping).length} advisors out of ${uniqueNames.length} for showroom: ${showroomId}`);
    return mapping;
  }

  /**
   * Get all advisors for a showroom
   * Useful for admin views
   */
  async getAdvisorsByShowroom(showroomId) {
    try {
      const advisors = await User.find({
        showroom_id: showroomId ? new mongoose.Types.ObjectId(showroomId) : undefined
      }).select('_id name email username');

      return advisors;
    } catch (error) {
      console.error('❌ Error fetching advisors:', error);
      return [];
    }
  }
}

export default new AdvisorMappingService();

