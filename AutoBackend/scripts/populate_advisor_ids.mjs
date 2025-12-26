#!/usr/bin/env node
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/automobileDashboardTest3'
const APPLY = process.argv.includes('--apply')

console.log(`Populate Advisor IDs Script. APPLY=${APPLY}`)

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME || undefined })
  console.log('✅ Connected to MongoDB\n')

  const User = (await import('../models/User.js')).default
  const BookingListData = (await import('../models/BookingListData.js')).default

  // Find all bookings that don't have advisor_id set
  const bookingsWithoutAdvisorId = await BookingListData.find({
    $or: [
      { advisor_id: { $exists: false } },
      { advisor_id: null }
    ],
    service_advisor: { $exists: true, $ne: null, $ne: '' }
  }).lean()

  console.log(`📋 Found ${bookingsWithoutAdvisorId.length} bookings without advisor_id\n`)

  if (bookingsWithoutAdvisorId.length === 0) {
    console.log('✅ All bookings already have advisor_id set!')
    await mongoose.disconnect()
    process.exit(0)
  }

  // Get all users to create a mapping
  const allUsers = await User.find({}).select('_id name showroom_id').lean()
  console.log(`👥 Found ${allUsers.length} users in database\n`)

  // Create a mapping of advisor name -> user ID (case-insensitive, normalized)
  const advisorNameMap = {}
  allUsers.forEach(user => {
    if (user.name) {
      const normalizedName = user.name.trim().toLowerCase()
      advisorNameMap[normalizedName] = {
        userId: user._id,
        showroomId: user.showroom_id,
        originalName: user.name
      }
    }
  })

  let updatedCount = 0
  let skippedCount = 0
  const updates = []

  for (const booking of bookingsWithoutAdvisorId) {
    const advisorName = booking.service_advisor?.trim()
    if (!advisorName) {
      skippedCount++
      continue
    }

    const normalizedBookingAdvisorName = advisorName.toLowerCase()
    
    // Try exact match first
    let matchedUser = advisorNameMap[normalizedBookingAdvisorName]
    
    // If no exact match, try partial match (contains)
    if (!matchedUser) {
      for (const [normalizedName, userData] of Object.entries(advisorNameMap)) {
        if (normalizedName.includes(normalizedBookingAdvisorName) || 
            normalizedBookingAdvisorName.includes(normalizedName)) {
          matchedUser = userData
          break
        }
      }
    }

    if (matchedUser) {
      // Check if booking's showroom_id matches user's showroom_id
      const bookingShowroomId = booking.showroom_id ? String(booking.showroom_id) : null
      const userShowroomId = matchedUser.showroomId ? String(matchedUser.showroomId) : null

      if (bookingShowroomId && userShowroomId && bookingShowroomId === userShowroomId) {
        updates.push({
          bookingId: booking._id,
          advisorName: advisorName,
          userId: matchedUser.userId,
          userName: matchedUser.originalName,
          showroomId: userShowroomId
        })
      } else {
        console.log(`⚠️  Skipping booking ${booking._id}: Showroom mismatch`)
        console.log(`   Booking showroom: ${bookingShowroomId}, User showroom: ${userShowroomId}`)
        skippedCount++
      }
    } else {
      console.log(`⚠️  No user found for advisor name: "${advisorName}"`)
      skippedCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Total bookings without advisor_id: ${bookingsWithoutAdvisorId.length}`)
  console.log(`   Matched and ready to update: ${updates.length}`)
  console.log(`   Skipped (no match or showroom mismatch): ${skippedCount}\n`)

  if (updates.length === 0) {
    console.log('⚠️  No bookings can be updated. Check advisor name matching.')
    await mongoose.disconnect()
    process.exit(0)
  }

  if (APPLY) {
    console.log('🔄 Updating bookings...\n')
    for (const update of updates) {
      await BookingListData.updateOne(
        { _id: update.bookingId },
        { $set: { advisor_id: update.userId } }
      )
      console.log(`✅ Updated booking ${update.bookingId}: "${update.advisorName}" -> ${update.userName} (${update.userId})`)
      updatedCount++
    }
    console.log(`\n✅ Successfully updated ${updatedCount} bookings with advisor_id`)
  } else {
    console.log('📝 Dry-run: Would update the following bookings:\n')
    updates.forEach((update, idx) => {
      console.log(`${idx + 1}. Booking ${update.bookingId}`)
      console.log(`   Advisor: "${update.advisorName}"`)
      console.log(`   → User: ${update.userName} (${update.userId})`)
      console.log(`   Showroom: ${update.showroomId}\n`)
    })
    console.log(`\n💡 Run with --apply flag to actually update the database`)
  }

  await mongoose.disconnect()
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})

