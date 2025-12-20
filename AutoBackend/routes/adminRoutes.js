import express from 'express'
import User from '../models/User.js'
import { requireAdmin } from '../middleware/jwtAdmin.js'

const router = express.Router()

// POST /api/admin/reset-password
// Body: { email?: string, userId?: string, newPassword: string }
router.post('/reset-password', requireAdmin, async (req, res) => {
  try {
    const { email, userId, newPassword } = req.body
    if (!newPassword) return res.status(400).json({ success: false, message: 'newPassword is required' })

    let user = null
    if (userId) user = await User.findById(userId)
    else if (email) user = await User.findOne({ email: email.toLowerCase() })
    else return res.status(400).json({ success: false, message: 'email or userId is required' })

    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    // Set plain password so pre-save hook hashes it once
    user.user_password = newPassword
    await user.save()

    return res.json({ success: true, message: 'Password reset successfully' })
  } catch (err) {
    console.error('Admin reset-password error:', err)
    return res.status(500).json({ success: false, message: 'Failed to reset password', error: err.message })
  }
})

export default router
