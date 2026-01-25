import { PrismaClient } from "@prisma/client";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
    console.log("🗑️  Emptying database...");

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI");

    // 1. Drop Legacy Collections via Native Mongo Driver
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    const collections = await db.listCollections().toArray();
    // Drop known legacy collections + Prisma collections to be safe
    const collectionsToDrop = ["users", "products", "bills", "vehicles", "trips", "godowns", "User", "Product", "Bill", "Vehicle", "Trip", "Warehouse", "WarehouseAccess"];

    for (const col of collections) {
        if (collectionsToDrop.includes(col.name)) {
            try {
                await db.collection(col.name).drop();
                console.log(`Dropped collection: ${col.name}`);
            } catch (e) {
                console.log(`Failed to drop ${col.name}:`, e);
            }
        }
    }
    await client.close();

    console.log("✅ Database fully wiped (Legacy + Prisma).");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
