const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const superAdmin = await db.collection('users').findOne({ role: 'SUPER_ADMIN' });
  const warehouseAdmin = await db.collection('users').findOne({ role: 'WAREHOUSE_ADMIN' });
  const staff = await db.collection('users').findOne({ role: 'STAFF' });
  const inactiveUser = await db.collection('users').findOne({ isActive: false });
  
  console.log("SUPER_ADMIN:", superAdmin ? superAdmin.email : 'None');
  console.log("WAREHOUSE_ADMIN:", warehouseAdmin ? warehouseAdmin.email : 'None');
  console.log("STAFF:", staff ? staff.email : 'None');
  console.log("INACTIVE:", inactiveUser ? inactiveUser.email : 'None');
  
  process.exit(0);
}
run();
