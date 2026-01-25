import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
    console.log("Updating all products quantity to 100...");

    const result = await prisma.product.updateMany({
        data: {
            quantity: 100
        }
    });

    console.log(`Updated ${result.count} products.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
