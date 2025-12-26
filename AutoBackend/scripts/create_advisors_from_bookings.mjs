#!/usr/bin/env node
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/automobileDashboardTest3'
const APPLY = process.argv.includes('--apply')

console.log(`Create Advisors from BookingListData Script. APPLY=${APPLY}`)

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME || undefined })
  console.log('✅ Connected to MongoDB\n')

  const User = (await import('../models/User.js')).default
  const Role = (await import('../models/Role.js')).default
  const UserRoleMapping = (await import('../models/UserRoleMapping.js')).default
  const BookingListData = (await import('../models/BookingListData.js')).default
  const Organization = (await import('../models/Organization.js')).default
  const Showroom = (await import('../models/Showroom.js')).default

  // Find organization
  let org = await Organization.findOne().lean()
  if (!org) {
    console.error('❌ No organization found. Please run seed_create_users.mjs first.')
    await mongoose.disconnect()
    process.exit(1)
  }

  // Get all unique advisor names from BookingListData
  console.log('🔍 Finding all unique advisors from BookingListData...')
  const advisorNames = await BookingListData.distinct('service_advisor', {
    service_advisor: { $exists: true, $ne: null, $ne: '' }
  })
  
  console.log(`📋 Found ${advisorNames.length} unique advisor names:\n`)
  advisorNames.forEach((name, idx) => {
    console.log(`   ${idx + 1}. ${name}`)
  })
  console.log('')

  if (advisorNames.length === 0) {
    console.log('⚠️  No advisors found in BookingListData. Please upload booking data first.')
    await mongoose.disconnect()
    process.exit(0)
  }

  // Get all showrooms to map advisors
  const showrooms = await Showroom.find({ org_id: org._id }).lean()
  if (showrooms.length === 0) {
    console.error('❌ No showrooms found. Please run seed_create_users.mjs first.')
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log(`📦 Found ${showrooms.length} showroom(s)\n`)

  // Find or create Service Advisor role for each showroom
  const advisorRoles = {}
  for (const showroom of showrooms) {
    const showroomId = String(showroom._id)
    let advisorRole = await Role.findOne({ 
      name: { $regex: /^service.?advisor$/i }, 
      showroom_id: showroomId 
    }).lean()

    if (!advisorRole) {
      if (APPLY) {
        advisorRole = await Role.create({ 
          name: 'Service Advisor', 
          desc: 'Service Advisor role - can only see their own bookings', 
          showroom_id: showroomId 
        })
        console.log(`✅ Created Service Advisor role for showroom: ${showroom.showroom_city || showroomId}`)
      } else {
        console.log(`⚠️  Service Advisor role missing for showroom: ${showroom.showroom_city || showroomId}`)
        advisorRole = { _id: 'ADVISOR_ROLE_ID', showroom_id: showroomId }
      }
    }
    advisorRoles[showroomId] = advisorRole
  }

  console.log('')

  // Create users for each advisor
  const createdUsers = []
  const existingUsers = []
  const credentials = []

  for (let i = 0; i < advisorNames.length; i++) {
    const advisorName = advisorNames[i].trim()
    if (!advisorName) continue

    // Generate unique email based on advisor name
    // Remove spaces and special chars, make lowercase
    const emailBase = advisorName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 30) // Limit length
    
    const email = `${emailBase}@advisor.test`
    
    // Generate phone number (unique)
    const phone = `9999${String(i + 1).padStart(6, '0')}` // 9999000001, 9999000002, etc.
    
    // Default password (can be changed later)
    const password = `advisor${i + 1}`

    // Find which showroom this advisor belongs to
    // Check BookingListData to see which showroom has bookings for this advisor
    const advisorBookings = await BookingListData.findOne({
      service_advisor: advisorName
    }).select('showroom_id').lean()

    let targetShowroom = showrooms[0] // Default to first showroom
    if (advisorBookings && advisorBookings.showroom_id) {
      const foundShowroom = showrooms.find(s => String(s._id) === String(advisorBookings.showroom_id))
      if (foundShowroom) {
        targetShowroom = foundShowroom
      }
    }

    const showroomId = String(targetShowroom._id)
    const advisorRole = advisorRoles[showroomId]

    // Check if user already exists
    const existing = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { phone: phone }
      ]
    }).lean()

    if (existing) {
      console.log(`⚠️  User already exists: ${email} (${existing._id})`)
      existingUsers.push({
        name: advisorName,
        email: email,
        phone: phone,
        password: password,
        userId: existing._id,
        showroom: targetShowroom.showroom_city || showroomId
      })

      // Check if role is assigned
      const roleMapping = await UserRoleMapping.findOne({ 
        user_id: existing._id, 
        role_id: advisorRole._id,
        showroom_id: showroomId
      }).lean()

      if (!roleMapping && APPLY) {
        await UserRoleMapping.create({
          user_id: existing._id,
          role_id: advisorRole._id,
          showroom_id: showroomId,
          created_by: existing._id,
          updated_by: existing._id
        })
        console.log(`   ✅ Assigned Service Advisor role`)
      }
      continue
    }

    // Create new user
    const username = email.split('@')[0]
    const newUser = {
      phone: phone,
      address: '',
      name: advisorName,
      username: username,
      org_id: org._id,
      showroom_id: targetShowroom._id,
      email: email.toLowerCase(),
      user_password: password
    }

    if (APPLY) {
      const created = await User.create(newUser)
      console.log(`✅ Created user: ${advisorName}`)
      console.log(`   Email: ${email}`)
      console.log(`   Password: ${password}`)
      console.log(`   Showroom: ${targetShowroom.showroom_city || showroomId}`)

      // Assign Service Advisor role
      await UserRoleMapping.create({
        user_id: created._id,
        role_id: advisorRole._id,
        showroom_id: showroomId,
        created_by: created._id,
        updated_by: created._id
      })
      console.log(`   ✅ Assigned Service Advisor role\n`)

      createdUsers.push({
        name: advisorName,
        email: email,
        phone: phone,
        password: password,
        userId: created._id,
        showroom: targetShowroom.showroom_city || showroomId
      })
    } else {
      console.log(`Dry-run: would create user:`)
      console.log(`   Name: ${advisorName}`)
      console.log(`   Email: ${email}`)
      console.log(`   Password: ${password}`)
      console.log(`   Showroom: ${targetShowroom.showroom_city || showroomId}\n`)
    }

    credentials.push({
      name: advisorName,
      email: email,
      password: password,
      showroom: targetShowroom.showroom_city || showroomId
    })
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 SUMMARY')
  console.log('='.repeat(60))
  
  if (APPLY) {
    console.log(`✅ Created ${createdUsers.length} new advisor user(s)`)
    console.log(`⚠️  Found ${existingUsers.length} existing user(s)`)
  } else {
    console.log(`📝 Would create ${credentials.length} advisor user(s)`)
  }

  console.log('\n📋 LOGIN CREDENTIALS:')
  console.log('='.repeat(60))
  
  const allCredentials = APPLY ? [...createdUsers, ...existingUsers] : credentials
  allCredentials.forEach((cred, idx) => {
    console.log(`\n${idx + 1}. ${cred.name}`)
    console.log(`   Email: ${cred.email}`)
    console.log(`   Password: ${cred.password}`)
    console.log(`   Showroom: ${cred.showroom}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('✅ Done!')
  console.log('='.repeat(60))
  console.log('\n💡 Each advisor can now login with their unique credentials.')
  console.log('💡 The system will automatically filter bookings by advisor_id.\n')

  await mongoose.disconnect()
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})

