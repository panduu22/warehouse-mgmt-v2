require('dotenv').config({ path: '.env.local' });
const { getDb } = require('../lib/db');

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
if (adminEmails.length === 0) {
  console.error('No admin email defined in NEXT_PUBLIC_ADMIN_EMAILS');
  process.exit(1);
}
const email = adminEmails[0]; // use the first admin email

(async () => {
  try {
    const db = await getDb();
    const result = await db.collection('User').updateOne({ email }, { $set: { role: 'ADMIN' } });
    console.log(`User role update: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    if (result.matchedCount === 0) {
      console.warn('No user found with that email.');
    }
  } catch (err) {
    console.error('Error updating user role', err);
    process.exit(1);
  }
  process.exit(0);
})();
