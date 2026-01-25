import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error("MONGODB_URI is not defined");
}

async function main() {
    console.log("Connecting to MongoDB...");
    const client = new MongoClient(uri!);
    await client.connect();
    const db = client.db();

    console.log(`Connected to database: ${db.databaseName}`);

    const collections = await db.listCollections().toArray();
    console.log("Collections found:");
    for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(` - ${col.name}: ${count} documents`);
    }

    await client.close();
}

main().catch(console.error);
