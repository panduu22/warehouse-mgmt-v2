import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function testAPI() {
    try {
        // Simulate what the API does
        const warehouseId = '697459d32951103de3b8da48';

        const products = await prisma.product.findMany({
            where: { warehouseId },
            take: 3,
            orderBy: { name: 'asc' }
        });

        console.log('\n🔍 Testing API Response (first 3 products):\n');
        console.log('═'.repeat(100));

        products.forEach((p, i) => {
            console.log(`\n${i + 1}. ${p.name}`);
            console.log(`   Response includes:`);
            console.log(`   - id: ${p.id}`);
            console.log(`   - quantity: ${p.quantity}`);
            console.log(`   - price (MRP): ${p.price}`);
            console.log(`   - invoiceCost: ${p.invoiceCost}`);
            console.log(`   - salePrice: ${p.salePrice} ${p.salePrice ? '✅' : '❌ MISSING'}`);
        });

        console.log('\n' + '═'.repeat(100));

        // Check if salePrice exists in the type
        const firstProduct = products[0];
        console.log('\n📋 Product object keys:');
        console.log(Object.keys(firstProduct).join(', '));
        console.log('\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAPI();
