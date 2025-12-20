#!/usr/bin/env node
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/automobileDashboardTest3'
const APPLY = process.argv.includes('--apply')

console.log(`Seed users script. APPLY=${APPLY}`)

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME || undefined })
  console.log('Connected to MongoDB')

  const User = (await import('../models/User.js')).default
  const Role = (await import('../models/Role.js')).default
  const UserRoleMapping = (await import('../models/UserRoleMapping.js')).default
  const Organization = (await import('../models/Organization.js')).default
  const Showroom = (await import('../models/Showroom.js')).default

  // Find or pick an organization
  let org = await Organization.findOne().lean()
  if (!org) {
    if (APPLY) {
      org = await Organization.create({ owner_name: 'Shubh Hyundai' })
      console.log('Created Organization:', org._id)
    } else {
      console.log('No Organization found. Dry-run: would create Organization with owner_name="Shubh Hyundai"')
      org = { _id: null }
    }
  }

  // Find showroom belonging to this org
  // Find or create two showrooms: Patan and Palanpur
  let showroomPatan = await Showroom.findOne({ org_id: org._id, showroom_city: /^patan$/i })
  if (!showroomPatan) {
    if (APPLY) {
      showroomPatan = await Showroom.create({ showroom_city: 'Patan', showroom_address: 'Patan Branch', org_id: org._id })
      console.log('Created Patan Showroom:', showroomPatan._id)
    } else {
      console.log('Patan showroom missing. Dry-run: would create Patan showroom')
      showroomPatan = { _id: 'PATAN_SHOWROOM_ID' }
    }
  } else {
    console.log('Found Patan Showroom:', showroomPatan._id)
  }

  let showroomPalanpur = await Showroom.findOne({ org_id: org._id, showroom_city: /^palanpur$/i })
  if (!showroomPalanpur) {
    if (APPLY) {
      showroomPalanpur = await Showroom.create({ showroom_city: 'Palanpur', showroom_address: 'Palanpur Branch', org_id: org._id })
      console.log('Created Palanpur Showroom:', showroomPalanpur._id)
    } else {
      console.log('Palanpur showroom missing. Dry-run: would create Palanpur showroom')
      showroomPalanpur = { _id: 'PALANPUR_SHOWROOM_ID' }
    }
  } else {
    console.log('Found Palanpur Showroom:', showroomPalanpur._id)
  }
  
  // Clean up any "Unknown" showrooms for this org
  if (APPLY) {
    const unknownShowrooms = await Showroom.find({ org_id: org._id, showroom_city: /unknown/i })
    if (unknownShowrooms.length > 0) {
      console.log(`\n🧹 Found ${unknownShowrooms.length} "Unknown" showroom(s), cleaning up...`)
      for (const unknown of unknownShowrooms) {
        // Check if any users are using this showroom
        const usersWithUnknown = await User.countDocuments({ showroom_id: unknown._id })
        if (usersWithUnknown > 0) {
          console.log(`⚠️  Showroom ${unknown._id} has ${usersWithUnknown} users, updating them to Palanpur`)
          await User.updateMany({ showroom_id: unknown._id }, { $set: { showroom_id: showroomPalanpur._id } })
        }
        await Showroom.deleteOne({ _id: unknown._id })
        console.log(`✅ Removed Unknown showroom: ${unknown._id}`)
      }
    }
  }

  const patanShowroomId = showroomPatan._id ? String(showroomPatan._id) : (process.env.PATAN_SHOWROOM_ID || 'patan_showroom')
  const palanpurShowroomId = showroomPalanpur._id ? String(showroomPalanpur._id) : (process.env.PALANPUR_SHOWROOM_ID || 'palanpur_showroom')

  // Ensure Owner role exists in Palanpur (owners will be assigned to Palanpur by default)
  let ownerRole = await Role.findOne({ name: 'Owner', showroom_id: palanpurShowroomId })
  if (!ownerRole) {
    if (APPLY) {
      ownerRole = await Role.create({ name: 'Owner', desc: 'Owner role', showroom_id: palanpurShowroomId })
      console.log('Created Owner role:', ownerRole._id)
    } else {
      console.log('Owner role missing. Dry-run: would create Owner role with showroom_id=', palanpurShowroomId)
      ownerRole = { _id: 'OWNER_ROLE_ID' }
    }
  }

  const usersToCreate = [
    { name: 'SHUBHAM AGRAWAL', role: 'owner', phone: '9427647003', email: 'shubham.agrawal@shubhhyundai.com', showroom: 'palanpur' },
    { name: 'PRATHAM AGRAWAL', role: 'owner', phone: '9106944591', email: 'pratham.agrawal@shubhhyundai.com', showroom: 'palanpur' },
    { name: 'NILESH BATHER', role: 'none', phone: '9712712773', email: 'gmservice@shubhhyundai.com', showroom: 'palanpur' },
    { name: 'SACHIN PADHIYAR', role: 'none', phone: '9712712770', email: 'smservice@shubhhyundai.com', showroom: 'palanpur' },
    { name: 'KINJAL SOLANKI', role: 'none', phone: '9712712775', email: 'smservice.ptn@shubhhyundai.com', showroom: 'patan' },
    { name: 'FARHAN', role: 'none', phone: '6358241891', email: 'crmservice@shubhhyundai.com', showroom: 'palanpur' },
    { name: 'DINESH PRAJAPATI', role: 'none', phone: '6358241880', email: 'bsm@shubhhyundai.com', showroom: 'palanpur' }
  ]

  for (const u of usersToCreate) {
    const existing = await User.findOne({ email: u.email.toLowerCase() }).lean()
    if (existing) {
      console.log(`User exists: ${u.email} -> _id=${existing._id}`)
      // If owner and mapping doesn't exist, optionally create mapping scoped to Palanpur
      if (u.role === 'owner') {
        if (APPLY) {
          const mappingExists = await UserRoleMapping.findOne({ user_id: existing._id, role_id: ownerRole._id, showroom_id: palanpurShowroomId })
          if (!mappingExists) {
            await UserRoleMapping.create({ user_id: existing._id, role_id: ownerRole._id, showroom_id: palanpurShowroomId })
            console.log(`Assigned Owner role to existing user ${u.email}`)
          }
        } else {
          // Dry-run: avoid querying with placeholder role ids (ownerRole may be a placeholder)
          console.log(`Dry-run: would assign Owner role to existing user ${u.email}`)
        }
      }

      // Update showroom_id for existing user if different (APPLY only)
      const targetShowroom = u.showroom === 'patan' ? showroomPatan : showroomPalanpur
      if (APPLY && targetShowroom._id) {
        const currentShowroomId = existing.showroom_id ? String(existing.showroom_id) : null
        const targetShowroomId = String(targetShowroom._id)
        if (currentShowroomId !== targetShowroomId) {
          await User.updateOne({ _id: existing._id }, { $set: { showroom_id: targetShowroom._id } })
          console.log(`✅ Updated showroom for ${u.email} -> ${u.showroom} (${targetShowroom._id})`)
        } else {
          console.log(`✓ User ${u.email} already has correct showroom: ${u.showroom}`)
        }
      } else {
        const target = u.showroom === 'patan' ? 'Patan' : 'Palanpur'
        console.log(`Dry-run: would set showroom of ${u.email} to ${target}`)
      }

      continue
    }

    const username = u.email.split('@')[0]
    // Determine showroom id for this user (patan or palanpur)
    const targetShowroom = u.showroom === 'patan' ? showroomPatan : showroomPalanpur
    const targetShowroomId = targetShowroom._id ? String(targetShowroom._id) : (u.showroom === 'patan' ? patanShowroomId : palanpurShowroomId)

    const newUser = {
      phone: u.phone,
      address: '',
      name: u.name,
      username: username,
      org_id: org._id || undefined,
      showroom_id: targetShowroom._id || undefined,
      email: u.email.toLowerCase(),
      user_password: 'Welcome123!'
    }

    if (APPLY) {
      const created = await User.create(newUser)
      console.log(`Created user ${u.email} -> _id=${created._id}`)

      if (u.role === 'owner') {
        // assign owner role scoped to palanpur showroom
        await UserRoleMapping.create({ user_id: created._id, role_id: ownerRole._id, showroom_id: palanpurShowroomId, created_by: created._id, updated_by: created._id })
        console.log(`Assigned Owner role to ${u.email}`)
      }
    } else {
      console.log('Dry-run: would create user:', newUser)
      if (u.role === 'owner') console.log('Dry-run: would assign Owner role to', u.email)
    }
  }

  console.log('\nDone.')
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('Error in seed script:', err)
  process.exit(1)
})
