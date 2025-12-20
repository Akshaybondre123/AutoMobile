import dotenv from 'dotenv'

// Load environment variables (server.js already calls dotenv in runtime; this is defensive)
dotenv.config()

const DEFAULT_SHOWROOM_ID = process.env.DEFAULT_SHOWROOM_ID || null
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || null

export function getDefaultShowroomId() {
  return DEFAULT_SHOWROOM_ID
}

export function getDefaultOrgId() {
  return DEFAULT_ORG_ID
}

export default {
  getDefaultShowroomId,
  getDefaultOrgId,
}
