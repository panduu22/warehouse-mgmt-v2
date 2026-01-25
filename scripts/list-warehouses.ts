import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function listWarehouses() {
    try {
        const warehouses = await prisma.warehouse.findMany({
            select: {
                id: true,
                name: true,
                location: true,
                _count: {
                    select: { products: true }
                }
            }
        });

        console.log('\n📋 Available Warehouses:\n');
        console.log('═'.repeat(80));

        warehouses.forEach((wh, index) => {
            console.log(`\n${index + 1}. ${wh.name}`);
            console.log(`   Location: ${wh.location}`);
            console.log(`   ID: ${wh.id}`);
            console.log(`   Products: ${wh._count.products}`);
        });

        console.log('\n' + '═'.repeat(80));
        console.log('\n📝 To replace products in a warehouse, run:');
        console.log('   npx tsx scripts/replace-warehouse-products.ts <warehouse-id>\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listWarehouses();
