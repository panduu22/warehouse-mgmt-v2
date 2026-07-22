const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const hash = await bcrypt.hash('password123', 10);
  
  // Create an inactive user
  await db.collection('users').updateOne(
    { email: 'inactive@test.com' },
    { $set: { name: 'Inactive User', email: 'inactive@test.com', password: hash, role: 'STAFF', isActive: false, warehouses: [] } },
    { upsert: true }
  );

  // Create an unassigned warehouse user (STAFF with no warehouses)
  await db.collection('users').updateOne(
    { email: 'unassigned@test.com' },
    { $set: { name: 'Unassigned User', email: 'unassigned@test.com', password: hash, role: 'STAFF', isActive: true, warehouses: [] } },
    { upsert: true }
  );

  console.log("Created/Updated inactive@test.com and unassigned@test.com");
  process.exit(0);
}
run();
