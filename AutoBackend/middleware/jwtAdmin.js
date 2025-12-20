import jwt from 'jsonwebtoken'
import * as rbacService from '../services/rbacService.js'

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'

// Middleware to require a valid JWT and that the user has the 'admin' role
export async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization
    if (!auth) return res.status(401).json({ success: false, message: 'Missing Authorization header' })

    const token = auth.replace(/^Bearer\s+/i, '')
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token', error: err.message })
    }

    const userId = decoded.sub
    if (!userId) return res.status(401).json({ success: false, message: 'Invalid token payload' })

    // Check RBAC for admin role; if rbacService fails, deny
    let roles = []
    try {
      roles = await rbacService.getUserRoles(userId)
    } catch (err) {
      console.warn('RBAC check failed:', err.message)
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    if (!Array.isArray(roles) || !roles.some(r => (r && (r.name === 'admin' || r.role_key === 'admin' || r.name === 'administrator')))) {
      return res.status(403).json({ success: false, message: 'Admin role required' })
    }

    req.adminUserId = userId
    next()
  } catch (err) {
    console.error('requireAdmin error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export default requireAdmin
