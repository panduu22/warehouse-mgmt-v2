const mongoose = require('mongoose');

const SOURCE_DB_NAME = 'warehouse-mgmt';
const TARGET_DB_NAME = 'warehouse-mgmt-v2';
const MONGODB_URI = 'mongodb+srv://pandu:pandu22@cluster0.wywdega.mongodb.net/?retryWrites=true&w=majority';
const NEW_WAREHOUSE_ID = '69b9a1ba1b0b43bd8d36d5de'; // Main Warehouse in v2

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        const client = await mongoose.connect(MONGODB_URI);
        
        const sourceDb = client.connection.useDb(SOURCE_DB_NAME);
        const targetDb = client.connection.useDb(TARGET_DB_NAME);

        const sourceCollection = sourceDb.collection('Product');
        const targetCollection = targetDb.collection('products');

        console.log(`Fetching products from ${SOURCE_DB_NAME}.Product...`);
        const products = await sourceCollection.find({}).toArray();
        console.log(`Found ${products.length} products.`);

        if (products.length === 0) {
            console.log('No products to migrate.');
            return;
        }

        console.log(`Mapping products to new Warehouse ID: ${NEW_WAREHOUSE_ID}...`);
        const migratedProducts = products.map(p => {
            // Remove the old _id to avoid collisions if necessary, or keep it if you want to preserve history.
            // Usually best to keep _id if the models are consistent.
            const { _id, ...rest } = p;
            return {
                ...rest,
                warehouseId: new mongoose.Types.ObjectId(NEW_WAREHOUSE_ID),
                createdAt: p.createdAt || new Date(),
                updatedAt: p.updatedAt || new Date()
            };
        });

        console.log(`Inserting ${migratedProducts.length} products into ${TARGET_DB_NAME}.products...`);
        const result = await targetCollection.insertMany(migratedProducts);
        console.log(`Successfully migrated ${result.insertedCount} products.`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

migrate();
