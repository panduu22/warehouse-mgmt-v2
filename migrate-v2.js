const mongoose = require('mongoose');

const SOURCE_DB_NAME = 'warehouse-mgmt';
const TARGET_DB_NAME = 'warehouse-mgmt-v2';
const MONGODB_URI = 'mongodb+srv://pandu:pandu22@cluster0.wywdega.mongodb.net/?retryWrites=true&w=majority';

// Known IDs
const NEW_MAIN_WAREHOUSE_ID = '69b9a1ba1b0b43bd8d36d5de';
const OLD_MAIN_UNIT_ID = '697459d32951103de3b8da48';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        const client = await mongoose.connect(MONGODB_URI);
        
        const sourceDb = client.connection.useDb(SOURCE_DB_NAME);
        const targetDb = client.connection.useDb(TARGET_DB_NAME);

        const sourceWarehouses = sourceDb.collection('Warehouse');
        const targetWarehouses = targetDb.collection('warehouses');
        
        const sourceProducts = sourceDb.collection('Product');
        const targetProducts = targetDb.collection('products');

        console.log('--- Migrating Warehouses ---');
        const oldWarehouses = await sourceWarehouses.find({}).toArray();
        const idMap = {};

        for (const oldWh of oldWarehouses) {
            if (oldWh._id.toString() === OLD_MAIN_UNIT_ID) {
                console.log(`Mapping old "Main Unit" to existing new "Main Warehouse" (${NEW_MAIN_WAREHOUSE_ID})`);
                idMap[OLD_MAIN_UNIT_ID] = NEW_MAIN_WAREHOUSE_ID;
            } else {
                console.log(`Creating/Mapping warehouse: ${oldWh.name}...`);
                // Check if already exists in target by name
                const existing = await targetWarehouses.findOne({ name: oldWh.name });
                if (existing) {
                    console.log(`  Found existing target warehouse: ${existing._id}`);
                    idMap[oldWh._id.toString()] = existing._id.toString();
                } else {
                    const result = await targetWarehouses.insertOne({
                        name: oldWh.name,
                        location: oldWh.location || '',
                        isMain: false,
                        createdBy: new mongoose.Types.ObjectId("69b99da2688336211014d74b"), // Hardcoded for consistency
                        createdAt: oldWh.createdAt || new Date(),
                        updatedAt: oldWh.updatedAt || new Date()
                    });
                    console.log(`  Created new target warehouse: ${result.insertedId}`);
                    idMap[oldWh._id.toString()] = result.insertedId.toString();
                }
            }
        }

        console.log('Warehouse ID Map:', idMap);

        console.log('\n--- Migrating Products ---');
        const allProducts = await sourceProducts.find({}).toArray();
        console.log(`Found ${allProducts.length} total products in legacy.`);

        const migratedDocs = [];
        for (const p of allProducts) {
            const oldWhId = p.warehouseId ? p.warehouseId.toString() : null;
            const newWhId = idMap[oldWhId];

            if (!newWhId) {
                console.warn(`  Warning: Product ${p.name} (${p.sku}) has unknown warehouseId ${oldWhId}. Skipping.`);
                continue;
            }

            const { _id, warehouseId, ...rest } = p;
            migratedDocs.push({
                ...rest,
                warehouseId: new mongoose.Types.ObjectId(newWhId),
                createdAt: p.createdAt || new Date(),
                updatedAt: p.updatedAt || new Date()
            });
        }

        if (migratedDocs.length > 0) {
            console.log(`Inserting ${migratedDocs.length} products into ${TARGET_DB_NAME}.products...`);
            const result = await targetProducts.insertMany(migratedDocs);
            console.log(`Successfully migrated ${result.insertedCount} products.`);
        } else {
            console.log('No products to migrate.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

migrate();
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
