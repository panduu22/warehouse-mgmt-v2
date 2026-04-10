import mongoose from "mongoose";
import dotenv from "dotenv";

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
        const n = (p.name || "").toLowerCase();
        const pack = (p.pack || "").toLowerCase();
        const combined = `${n} ${pack}`;
        let bpp = 24; // default
        
        // Specific product overrides
        if (combined.includes("maaza") && combined.includes("250")) bpp = 30;
        else if (combined.includes("mazza") && combined.includes("250")) bpp = 30;
        else if (combined.includes("mm pulpy orange") && combined.includes("250")) bpp = 30;
        else if (combined.includes("mm pulpy orange") && combined.includes("1 ltr")) bpp = 12;
        else if (combined.includes("mm pulpy orange") && combined.includes("850 ml")) bpp = 15;
        // Standard mappings
        else if (combined.includes("150 ml tetra")) bpp = 40;
        else if (combined.includes("200 ml rgb")) bpp = 24;
        else if (combined.includes("250 ml pet")) bpp = 28;
        else if (combined.includes("300 ml rgb")) bpp = 24;
        else if (combined.includes("330 ml can")) bpp = 24;
        else if (combined.includes("300 ml can")) bpp = 24;
        else if (combined.includes("300 ml") && combined.includes("kinley water")) bpp = 24;
        else if (combined.includes("350 ml can")) bpp = 24;
        else if (combined.includes("400 ml")) bpp = 24;
        else if (combined.includes("500 ml") && combined.includes("kinley water")) bpp = 24;
        else if (combined.includes("600 ml pet")) bpp = 24;
        else if (combined.includes("740 ml")) bpp = 24;
        else if (combined.includes("750 ml")) bpp = 24;
        else if (combined.includes("1 ltr pet")) bpp = 15;
        else if (combined.includes("1 ltr") && combined.includes("kinley water")) bpp = 15;
        else if (combined.includes("1.2 ltr")) bpp = 12;
        else if (combined.includes("1.25 ltr")) bpp = 12;
        else if (combined.includes("1.5 ltr pet")) bpp = 12;
        else if (combined.includes("1.75 ltr")) bpp = 12;
        else if (combined.includes("2 ltr")) bpp = 9;
        else if (combined.includes("2.25 ltr pet")) bpp = 9;
        // Fallback checks for volume partials
        else if (combined.includes("2.25")) bpp = 9;
        else if (combined.includes("1.5")) bpp = 12;
        else if (combined.includes("1.25")) bpp = 12;
        else if (combined.includes("600")) bpp = 24;
        else if (combined.includes("250")) bpp = 28;
        else if (combined.includes(" tetra")) bpp = 40;
        else {
             const match = pack.match(/^\d+/);
             if (match) bpp = parseInt(match[0], 10);
        }

        if (p.bottlesPerPack !== bpp) {
            console.log(`Updating ${n} - ${pack}: ${p.bottlesPerPack} -> ${bpp}`);
            await Product.updateOne({ _id: p._id }, { $set: { bottlesPerPack: bpp } });
            updatedCount++;
        }
    }
    
    console.log(`Updated ${updatedCount} products.`);
    process.exit(0);
}

updateBPP().catch(console.error);
