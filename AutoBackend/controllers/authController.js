import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import * as rbacService from '../services/rbacService.js'

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'
const TOKEN_EXPIRES_IN = '8h'

export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    // Gather roles and permissions (if RBAC data exists)
    let roles = []
    let permissions = []
    try {
      roles = await rbacService.getUserRoles(user._id)
      permissions = await rbacService.getUserPermissions(user._id)
    } catch (err) {
      // non-fatal: continue without RBAC
      console.warn('RBAC lookup failed during login:', err.message)
    }

    // Format role names in Title Case and join with " | "
    // Example: ["Service Manager", "CRM", "BSM"] -> "Service Manager | CRM | BSM"
    const formatRoleKey = (roleDocs) => {
      if (!roleDocs || roleDocs.length === 0) return undefined
      
      // Convert role names to Title Case and join with " | "
      const formattedRoles = roleDocs.map(role => {
        const name = (role.name || '').toString().trim()
        // Convert to Title Case: "service_manager" -> "Service Manager"
        return name
          .split(/[\s_]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      })
      
      return formattedRoles.join(' | ')
    }

    const payload = {
      sub: user._id,
      email: user.email,
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN })

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      username: user.username,
      org_id: user.org_id,
      showroom_id: user.showroom_id,
      created_at: user.created_at,
      // Format role key as "Service Manager | CRM | BSM" in Title Case
      role: formatRoleKey(roles)
    }

  return res.status(200).json({ success: true, data: { user: safeUser, token } })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Login failed', error: error.message })
  }
}

export const me = async (req, res) => {
  // Simple token-based lookup; caller should attach middleware in future
  try {
    const auth = req.headers.authorization
    if (!auth) return res.status(401).json({ success: false, message: 'Missing Authorization header' })

    const token = auth.replace(/^Bearer\s+/i, '')
    const decoded = jwt.verify(token, JWT_SECRET)
    const userId = decoded.sub
    const user = await User.findById(userId).lean()
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const roles = await rbacService.getUserRoles(user._id)
    const permissions = await rbacService.getUserPermissions(user._id)

    // Derive role key for frontend convenience (mirrors login behavior)
    const deriveRoleKey = (roleDocs) => {
      if (!roleDocs || roleDocs.length === 0) return undefined
      const name = (roleDocs[0].name || '').toString().toLowerCase().trim()
      let key = name.replace(/\s+/g, '_')
      if (key === 'general_manager') key = 'owner'
      return key
    }

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      username: user.username,
      org_id: user.org_id,
      showroom_id: user.showroom_id,
      created_at: user.created_at,
      updated_at: user.updated_at,
      role: deriveRoleKey(roles),
      roles: roles
    }

    return res.json({ success: true, data: { user: safeUser, roles, permissions } })
  } catch (err) {
    console.error('me error:', err)
    return res.status(401).json({ success: false, message: 'Invalid token', error: err.message })
  }
}
