const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/warehouse-mgmt"; // Assuming default local if not provided, but wait, the project uses mongoose. Let's see how dbConnect works.
  
}
run();
