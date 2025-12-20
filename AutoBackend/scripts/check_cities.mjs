#!/usr/bin/env node
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/automobileDashboardTest3'

async function checkCities() {
  await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME || undefined })
  console.log('Connected to MongoDB')

  const Showroom = (await import('../models/Showroom.js')).default

  // Get all showrooms
  const showrooms = await Showroom.find().lean()
  console.log('\n📋 All Showrooms:')
  showrooms.forEach(s => {
    console.log(`  - City: "${s.showroom_city}" | ID: ${s._id} | Org: ${s.org_id}`)
  })

  // Get distinct cities
  const cities = await Showroom.distinct('showroom_city', { 
    showroom_city: { $exists: true, $ne: null, $ne: '' } 
  })
  
  console.log('\n🏙️  Distinct Cities:', cities)
  
  const validCities = cities
    .filter(city => city && city.toLowerCase() !== 'unknown')
    .sort((a, b) => a.localeCompare(b))
  
  console.log('✅ Valid Cities (filtered):', validCities)
  console.log(`\n📊 Total: ${validCities.length} cities`)

  await mongoose.disconnect()
}

checkCities().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})

