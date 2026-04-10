import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import Product from "../models/Product";
import { parsePack } from "../lib/stock-utils";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function migrate() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is not defined in .env.local");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        const products = await Product.find({});
        console.log(`Found ${products.length} products to process`);

        let updated = 0;
        let errors = 0;

        for (const product of products) {
            try {
                const newBpp = parsePack(product.pack, product.name);
                const oldBpp = (product as any).bottlesPerPack;

                if (newBpp !== oldBpp) {
                    await Product.updateOne(
                        { _id: product._id },
                        { $set: { bottlesPerPack: newBpp } }
                    );
                    console.log(`Updated ${product.name}: ${oldBpp} -> ${newBpp}`);
                    updated++;
                } else {
                    console.log(`Skipped ${product.name}: Already ${newBpp}`);
                }
            } catch (err) {
                console.error(`Error updating ${product.name}:`, err);
                errors++;
            }
        }

        console.log(`Migration finished: ${updated} updated, ${errors} errors.`);
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
