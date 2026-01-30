const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is missing in .env.local');
        process.exit(1);
    }

    console.log('Attempting to connect to MongoDB...');
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Successfully connected to MongoDB!');
        const admin = client.db().admin();
        const info = await admin.serverStatus();
        console.log(`Server version: ${info.version}`);
    } catch (err) {
        console.error('❌ Connection failed:', err);
    } finally {
        await client.close();
    }
}

testConnection();
