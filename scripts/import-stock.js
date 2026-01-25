const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');

const MONGODB_URI = "mongodb+srv://pandu:pandu22@cluster0.wywdega.mongodb.net/warehouse-mgmt?retryWrites=true&w=majority";

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0 },
    location: { type: String },
    pack: { type: String },
    flavour: { type: String },
    mrp: { type: Number },
    invoiceCost: { type: Number },
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const filePath = path.join(__dirname, '../data/stock.xlsx');
    console.log("Reading file:", filePath);

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rows.length} rows`);

    let imported = 0;
    for (const row of rows) {
        // Headers: Pack, Flavour, MRP, 'Invoce cost'
        const pack = row['Pack'];
        const flavour = row['Flavour'];
        const mrp = row['MRP'];
        const invoiceCost = row['Invoce cost'];

        if (!pack || !flavour) continue;

        const name = `${flavour} ${pack}`;
        // Generate SKU: MAZZA-150ML-TETRA
        const skuBase = name.toUpperCase().replace(/[^A-Z0-9]/g, '-');
        const sku = skuBase + '-' + Math.floor(Math.random() * 1000); // Simple uniqueness

        try {
            await Product.create({
                name,
                sku,
                quantity: 100, // Default stock for testing/usage as per "put all data in" -> implies availability
                price: mrp || 0,
                location: "Main Warehouse",
                pack,
                flavour,
                mrp,
                invoiceCost
            });
            imported++;
        } catch (e) {
            console.error(`Failed to import ${name}:`, e.message);
        }
    }

    console.log(`Successfully imported ${imported} products`);
    await mongoose.disconnect();
}

main().catch(console.error);
