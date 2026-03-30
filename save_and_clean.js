/**
 * EMERGENCY SCRIPT: Save first 5 registrations, delete all spam
 * Run with: node save_and_clean.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected!\n');

  const db = mongoose.connection.db;
  const collection = db.collection('participants');

  // Count total
  const totalCount = await collection.countDocuments();
  console.log(`📊 Total registrations found: ${totalCount}`);

  // Fetch first 5 by creation date
  const first5 = await collection.find().sort({ createdAt: 1 }).limit(5).toArray();
  console.log(`\n💾 Saving first ${first5.length} registrations...\n`);

  for (const p of first5) {
    console.log(`  ✅ ${p.participantId} | ${p.name} | ${p.email} | ${p.regNo} | ${new Date(p.createdAt).toISOString()}`);
  }

  // Save backup
  const backupPath = './backup_first_5.json';
  fs.writeFileSync(backupPath, JSON.stringify(first5, null, 2));
  console.log(`\n💾 Backup saved to ${backupPath}`);

  // Delete ALL documents
  const deleteResult = await collection.deleteMany({});
  console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} documents`);

  // Re-insert the first 5
  if (first5.length > 0) {
    const insertResult = await collection.insertMany(first5);
    console.log(`✅ Re-inserted ${insertResult.insertedCount} legitimate registrations`);
  }

  // Verify
  const finalCount = await collection.countDocuments();
  console.log(`\n📊 Final count: ${finalCount} registrations`);
  console.log('\n✅ DONE! Spam purged, legitimate data preserved.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ ERROR:', err);
  process.exit(1);
});
