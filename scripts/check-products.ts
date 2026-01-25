import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkProducts() {
    try {
        const products = await prisma.product.findMany({
            where: { warehouseId: '697459d32951103de3b8da48' },
            take: 5,
            orderBy: { name: 'asc' }
        });

        console.log('\n📦 Sample Products:\n');
        console.log('═'.repeat(100));

        products.forEach((p, i) => {
            console.log(`\n${i + 1}. ${p.name}`);
            console.log(`   Pack: ${p.pack}`);
            console.log(`   Flavour: ${p.flavour}`);
            console.log(`   Quantity: ${p.quantity}`);
            console.log(`   MRP (price): ₹${p.price}`);
            console.log(`   Invoice Cost: ₹${p.invoiceCost || 'N/A'}`);
            console.log(`   Sale Price: ₹${p.salePrice || 'N/A'}`);
        });

        console.log('\n' + '═'.repeat(100) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProducts();
