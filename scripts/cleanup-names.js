const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable inside .env.local");
    process.exit(1);
}

// Define Schema for simplified interaction
const ProductSchema = new mongoose.Schema({
    name: String,
    sku: String,
    pack: String,
    flavour: String
}, { strict: false });

const Product = mongoose.model('Product', ProductSchema);

async function cleanupNames() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        const products = await Product.find({});
        console.log(`Found ${products.length} products having names.`);

        let updatedCount = 0;

        for (const p of products) {
            // Logic: delete the last numbers of every stock, just keep the pack and flavour names
            // The format I imported was `${pack} ${flavour} ${idx}`
            // So "250ml Vanilla 0", "250ml Vanilla 1", etc.
            // But user wants "250ml Vanilla".

            // If we use Pack and Flavour fields, it is safer to regenerate.
            // If Pack and Flavour are present, use them.

            let newName = p.name;

            if (p.pack && p.flavour) {
                newName = `${p.pack} ${p.flavour}`;
            } else {
                // Heuristic: remove trailing numbers
                // Regex to remove trailing space and digits
                newName = p.name.replace(/\s+\d+$/, '');
            }

            if (newName !== p.name) {
                await Product.updateOne({ _id: p._id }, { $set: { name: newName } });
                updatedCount++;
                console.log(`Updated: "${p.name}" -> "${newName}"`);
            }
        }

        console.log(`Finished. Updated ${updatedCount} products.`);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupNames();
