import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

const prisma = new PrismaClient();

// Product data from the spreadsheet
const products = [
    { pack: "150 ml Tetra", flavour: "Mazza", mrp: 9.00, stockPc: 240, invoiceCost: 308.13, salePrice: 326 },
    { pack: "150 ml Tetra", flavour: "MM Apple", mrp: 9.00, stockPc: 69, invoiceCost: 308.19, salePrice: 326 },
    { pack: "150 ml Tetra", flavour: "MM LMN Fresh", mrp: 9.00, stockPc: 0, invoiceCost: 308.19, salePrice: 326 },
    { pack: "200 ml RGB", flavour: "Thums up", mrp: 10.00, stockPc: 145, invoiceCost: 174.77, salePrice: 192 },
    { pack: "200 ml RGB", flavour: "Sprite", mrp: 10.00, stockPc: 131, invoiceCost: 174.77, salePrice: 192 },
    { pack: "200 ml RGB", flavour: "Limca", mrp: 10.00, stockPc: 19, invoiceCost: 174.77, salePrice: 192 },
    { pack: "200 ml RGB", flavour: "Fanta", mrp: 10.00, stockPc: 64, invoiceCost: 174.77, salePrice: 192 },
    { pack: "200 ml RGB", flavour: "Coke", mrp: 10.00, stockPc: 97, invoiceCost: 174.77, salePrice: 192 },
    { pack: "200 ml RGB", flavour: "Mazza", mrp: 14.00, stockPc: 0, invoiceCost: 259.54, salePrice: 282 },
    { pack: "250 ml PET", flavour: "Thums up Charge", mrp: 20.00, stockPc: 10, invoiceCost: 470.80, salePrice: 505 },
    { pack: "250 ml PET", flavour: "Thums up", mrp: 20.00, stockPc: 262, invoiceCost: 475.77, salePrice: 505 },
    { pack: "250 ml PET", flavour: "Sprite", mrp: 20.00, stockPc: 220, invoiceCost: 475.77, salePrice: 505 },
    { pack: "250 ml PET", flavour: "Limca", mrp: 20.00, stockPc: 25, invoiceCost: 470.80, salePrice: 505 },
    { pack: "250 ml PET", flavour: "Fanta", mrp: 20.00, stockPc: 43, invoiceCost: 470.80, salePrice: 505 },
    { pack: "250 ml PET", flavour: "Coke", mrp: 20.00, stockPc: 21, invoiceCost: 470.80, salePrice: 505 },
    { pack: "250 ml PET", flavour: "Kinley Soda", mrp: 11.00, stockPc: 142, invoiceCost: 235.59, salePrice: 250 },
    { pack: "250 ml PET", flavour: "RimZim Fiz", mrp: 20.00, stockPc: 0, invoiceCost: 470.80, salePrice: 500 },
    { pack: "250 ml PET", flavour: "Zero Thums up", mrp: 10.00, stockPc: 17, invoiceCost: 204.00, salePrice: 230 },
    { pack: "250 ml PET", flavour: "Zero Sprite", mrp: 10.00, stockPc: 31, invoiceCost: 204.00, salePrice: 230 },
    { pack: "250 ml PET", flavour: "Zero Coke", mrp: 10.00, stockPc: 3, invoiceCost: 204.00, salePrice: 230 },
    { pack: "250 ml PET", flavour: "Mazza", mrp: 19.00, stockPc: 27, invoiceCost: 474.46, salePrice: 505 },
    { pack: "250 ml PET", flavour: "MM Pulpy orange", mrp: 24.00, stockPc: 88, invoiceCost: 593.92, salePrice: 630 },
    { pack: "300 ml RGB", flavour: "Thums up", mrp: 25.00, stockPc: 75, invoiceCost: 453.30, salePrice: 493 },
    { pack: "300 ml RGB", flavour: "Sprite", mrp: 25.00, stockPc: 54, invoiceCost: 453.30, salePrice: 493 },
    { pack: "300 ml RGB", flavour: "Fanta", mrp: 25.00, stockPc: 0, invoiceCost: 453.30, salePrice: 493 },
    { pack: "300 ml RGB", flavour: "Coke", mrp: 25.00, stockPc: 0, invoiceCost: 453.30, salePrice: 493 },
    { pack: "300 ml CAN", flavour: "Thums up", mrp: 70.00, stockPc: 0, invoiceCost: 959.04, salePrice: 1010 },
    { pack: "300 ml CAN", flavour: "Sprite", mrp: 70.00, stockPc: 0, invoiceCost: 959.04, salePrice: 1010 },
    { pack: "300 ml CAN", flavour: "Limca", mrp: 70.00, stockPc: 0, invoiceCost: 959.04, salePrice: 1010 },
    { pack: "300 ml CAN", flavour: "Fanta", mrp: 40.00, stockPc: 0, invoiceCost: 817.58, salePrice: 878 },
    { pack: "300 ml CAN", flavour: "Coke", mrp: 70.00, stockPc: 0, invoiceCost: 959.04, salePrice: 1010 },
    { pack: "300 ml CAN", flavour: "Thums up", mrp: 40.00, stockPc: 0, invoiceCost: 821.36, salePrice: 878 },
    { pack: "300 ml CAN", flavour: "Sprite", mrp: 40.00, stockPc: 0, invoiceCost: 817.58, salePrice: 878 },
    { pack: "300 ml CAN", flavour: "Limca", mrp: 40.00, stockPc: 0, invoiceCost: 817.58, salePrice: 878 },
    { pack: "300 ml CAN", flavour: "Coke", mrp: 40.00, stockPc: 0, invoiceCost: 817.58, salePrice: 878 },
    { pack: "300 ml CAN", flavour: "Predator", mrp: 60.00, stockPc: 194, invoiceCost: 1042.65, salePrice: 1110 },
    { pack: "300 ml", flavour: "Kinley Water", mrp: 7.00, stockPc: 25, invoiceCost: 126.24, salePrice: 140 },
    { pack: "350 ml CAN", flavour: "Monster", mrp: 125.00, stockPc: 43, invoiceCost: 2050.54, salePrice: 2175 },
    { pack: "400 ml csd", flavour: "Thums up", mrp: 20.00, stockPc: 0, invoiceCost: 399.19, salePrice: 420 },
    { pack: "400 ml csd", flavour: "Sprite", mrp: 20.00, stockPc: 0, invoiceCost: 399.19, salePrice: 420 },
    { pack: "400 ml csd", flavour: "Coke", mrp: 20.00, stockPc: 0, invoiceCost: 399.19, salePrice: 420 },
    { pack: "500 ml", flavour: "Kinley Water", mrp: 9.00, stockPc: 18, invoiceCost: 174.19, salePrice: 185 },
    { pack: "600 ml PET", flavour: "Mazza", mrp: 35.00, stockPc: 33, invoiceCost: 748.13, salePrice: 795 },
    { pack: "740 ml", flavour: "Thums up", mrp: 40.00, stockPc: 36, invoiceCost: 842.86, salePrice: 900 },
    { pack: "740 ml", flavour: "Sprite", mrp: 40.00, stockPc: 21, invoiceCost: 842.86, salePrice: 900 },
    { pack: "740 ml", flavour: "Limca", mrp: 40.00, stockPc: 0, invoiceCost: 839.68, salePrice: 900 },
    { pack: "740 ml", flavour: "Fanta", mrp: 40.00, stockPc: 0, invoiceCost: 839.68, salePrice: 900 },
    { pack: "740 ml", flavour: "Coke", mrp: 40.00, stockPc: 0, invoiceCost: 839.68, salePrice: 900 },
    { pack: "750 ml", flavour: "Kinley Soda", mrp: 18.00, stockPc: 39, invoiceCost: 375.68, salePrice: 400 },
    { pack: "850 ml", flavour: "MM Pulpy orange", mrp: 50.00, stockPc: 0, invoiceCost: 670.32, salePrice: 710 },
    { pack: "1 ltr PET", flavour: "Thums up", mrp: 50.00, stockPc: 102, invoiceCost: 661.22, salePrice: 710 },
    { pack: "1 ltr PET", flavour: "Sprite", mrp: 50.00, stockPc: 48, invoiceCost: 661.22, salePrice: 710 },
    { pack: "1 ltr PET", flavour: "Limca", mrp: 50.00, stockPc: 0, invoiceCost: 661.22, salePrice: 710 },
    { pack: "1 ltr PET", flavour: "Fanta", mrp: 50.00, stockPc: 0, invoiceCost: 661.22, salePrice: 710 },
    { pack: "1 ltr PET", flavour: "Coke", mrp: 50.00, stockPc: 0, invoiceCost: 661.22, salePrice: 710 },
    { pack: "1 ltr PET", flavour: "MM Pulpy orange", mrp: 85.00, stockPc: 14, invoiceCost: 797.07, salePrice: 845 },
    { pack: "1 ltr", flavour: "Kinley Water", mrp: 18.00, stockPc: 605, invoiceCost: 160.77, salePrice: 175 },
    { pack: "1.2 ltr", flavour: "Mazza", mrp: 70.00, stockPc: 15, invoiceCost: 744.99, salePrice: 790 },
    { pack: "1.25 Ltr PET", flavour: "Kinley Soda", mrp: 30.00, stockPc: 0, invoiceCost: 316.15, salePrice: 336 },
    { pack: "1.75 ltr", flavour: "Mazza", mrp: 95.00, stockPc: 20, invoiceCost: 1042.90, salePrice: 1105 },
    { pack: "2 ltr", flavour: "Kinley Water", mrp: 28.00, stockPc: 10, invoiceCost: 165.06, salePrice: 180 },
    { pack: "1.5 ltr PET", flavour: "Thums up", mrp: 70.00, stockPc: 0, invoiceCost: 721.25, salePrice: 771 },
    { pack: "1.5 ltr PET", flavour: "Sprite", mrp: 70.00, stockPc: 0, invoiceCost: 721.25, salePrice: 771 },
    { pack: "2.25 Ltr PET", flavour: "Thums up", mrp: 100.00, stockPc: 165, invoiceCost: 790.89, salePrice: 845 },
    { pack: "2.25 Ltr PET", flavour: "Sprite", mrp: 100.00, stockPc: 61, invoiceCost: 790.89, salePrice: 845 },
    { pack: "2.25 Ltr PET", flavour: "Limca", mrp: 100.00, stockPc: 0, invoiceCost: 790.89, salePrice: 845 },
    { pack: "2.25 Ltr PET", flavour: "Fanta", mrp: 100.00, stockPc: 0, invoiceCost: 790.89, salePrice: 845 },
    { pack: "2.25 Ltr PET", flavour: "Coke", mrp: 100.00, stockPc: 0, invoiceCost: 790.89, salePrice: 845 },
];

async function replaceWarehouseProducts(warehouseId: string) {
    try {
        console.log(`🗑️  Deleting all products from warehouse: ${warehouseId}`);

        // Delete all existing products for this warehouse
        const deleteResult = await prisma.product.deleteMany({
            where: { warehouseId }
        });

        console.log(`✅ Deleted ${deleteResult.count} products`);

        console.log(`\n📦 Importing ${products.length} new products...`);

        // Import new products
        let imported = 0;
        for (const product of products) {
            const name = `${product.flavour} ${product.pack}`.trim();
            const sku = `${product.pack.replace(/\s+/g, '-')}-${product.flavour.replace(/\s+/g, '-')}`.toUpperCase();

            await prisma.product.create({
                data: {
                    name,
                    sku,
                    pack: product.pack,
                    flavour: product.flavour,
                    quantity: product.stockPc,
                    price: product.mrp,
                    mrp: product.mrp,
                    invoiceCost: product.invoiceCost,
                    salePrice: product.salePrice,
                    warehouseId
                }
            });

            imported++;
            if (imported % 10 === 0) {
                console.log(`  Imported ${imported}/${products.length}...`);
            }
        }

        console.log(`\n✅ Successfully imported ${imported} products!`);
        console.log(`\n📊 Summary:`);
        console.log(`   - Deleted: ${deleteResult.count} products`);
        console.log(`   - Imported: ${imported} products`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Get warehouse ID from command line argument
const warehouseId = process.argv[2];

if (!warehouseId) {
    console.error('❌ Please provide a warehouse ID as an argument');
    console.error('Usage: tsx scripts/replace-warehouse-products.ts <warehouse-id>');
    process.exit(1);
}

replaceWarehouseProducts(warehouseId);
