import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const warehouseId = "697459d32951103de3b8da48"; // Main Unit

async function main() {
    console.log("Starting stock import...");

    const filePath = path.join(process.cwd(), 'data/stock.xlsx');
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${data.length} rows.`);

    let imported = 0;

    for (const row of data) {
        const flavour = row['Flavour'] || '';
        const pack = row['Pack'] || '';
        const mrp = Number(row['MRP']) || 0;
        const invoiceCost = Number(row['Invoce cost']) || 0;

        const name = `${flavour} ${pack}`.trim();

        if (!name) continue;

        // Generate SKU
        const base = (flavour || "").substring(0, 3).toUpperCase();
        const pck = (pack || "").substring(0, 3).toUpperCase();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        const sku = `${base}-${pck}-${random}`.replace(/-+/g, "-");

        await prisma.product.create({
            data: {
                name,
                sku,
                quantity: 0, // Default to 0 as quantity is not in file
                price: mrp,
                invoiceCost: invoiceCost,
                pack: pack,
                flavour: flavour,
                warehouseId: warehouseId
            }
        });
        imported++;
        process.stdout.write(`\rImported ${imported}/${data.length}`);
    }

    console.log("\nImport complete!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
