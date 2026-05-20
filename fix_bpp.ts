import mongoose from "mongoose";
import dotenv from "dotenv";

import { parsePack } from "./lib/stock-utils";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is required");
    process.exit(1);
}

const productSchema = new mongoose.Schema({
    name: String,
    pack: String,
    bottlesPerPack: Number,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

async function updateBPP() {
    await mongoose.connect(MONGODB_URI as string);
    const products = await Product.find({});
    
    let updatedCount = 0;
    
    for (const p of products) {
        const bpp = parsePack(p.pack, p.name);

        if (p.bottlesPerPack !== bpp) {
            console.log(`Updating ${p.name} - ${p.pack}: ${p.bottlesPerPack} -> ${bpp}`);
            await Product.updateOne({ _id: p._id }, { $set: { bottlesPerPack: bpp } });
            updatedCount++;
        }
    }
    
    console.log(`Updated ${updatedCount} products.`);
    process.exit(0);
}

updateBPP().catch(console.error);
