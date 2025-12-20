import express from 'express'
import { login, me } from '../controllers/authController.js'

const router = express.Router()

// POST /api/auth/login
router.post('/login', login)

// GET /api/auth/me  (requires Authorization: Bearer <token>)
router.get('/me', me)

export default router
