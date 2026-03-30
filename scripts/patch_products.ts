import mongoose from "mongoose";
import dbConnect from "../lib/mongodb";
import Product from "../models/Product";
import Warehouse from "../models/Warehouse";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function patch() {
    try {
        console.log("Connecting to database...");
        await dbConnect();
        
        const mainWh = await Warehouse.findOne({ isMain: true });
        if (!mainWh) {
            console.error("Main Warehouse not found. Aborting.");
            return;
        }
        const mainWhId = mainWh._id.toString();
        console.log(`Target Main Warehouse ID: ${mainWhId}`);

        // 1. Correct the Warehouse ID for recently imported products
        // (Moving from RK Agencies to Main Warehouse)
        const wrongWhId = "69c9765c81147b73121f37d5";
        const moveResult = await Product.updateMany(
            { warehouseId: wrongWhId },
            { $set: { warehouseId: new mongoose.Types.ObjectId(mainWhId) } }
        );
        console.log(`Moved ${moveResult.modifiedCount} products to Main Warehouse.`);

        // 2. Fix missing Flavour and Pack fields
        const productsToFix = await Product.find({
            $or: [
                { flavour: { $in: ["", null] } },
                { pack: { $in: ["", null] } }
            ]
        });

        console.log(`Found ${productsToFix.length} products with missing flavour/pack.`);

        let patchedCount = 0;
        for (const p of productsToFix) {
            const name = p.name || "";
            // Example name: "Fanta 2.25 Ltr PET"
            // We want flavour: "Fanta", pack: "2.25 Ltr PET"
            
            // Basic heuristic:
            // - The first word is often the Brand/Flavour (e.g. Sprite, Thums Up, Fanta)
            // - The last parts are often the Pack/Size
            
            const parts = name.split(" ");
            if (parts.length >= 2) {
                // Heuristic: If we find a volume/unit (ml, Ltr, Pet, etc.)
                let flavour = parts[0];
                let pack = name.slice(parts[0].length).trim();
                
                // Refinements for multi-word brands/flavours like "Thums Up"
                if (parts[0].toLowerCase() === "thums" && parts[1]?.toLowerCase() === "up") {
                    flavour = "Thums Up";
                    pack = name.slice("Thums Up".length).trim();
                }

                p.flavour = flavour;
                p.pack = pack;
                await p.save();
                patchedCount++;
            }
        }

        console.log(`Successfully patched ${patchedCount} products.`);

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
        process.exit(0);
    }
}

patch();
