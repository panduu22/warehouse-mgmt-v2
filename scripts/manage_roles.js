const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error("Please add your Mongo URI to .env.local");
    process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
    try {
        await client.connect();
        const db = client.db();
        const usersCollection = db.collection("User");

        const users = await usersCollection.find({}).toArray();

        console.log("Users found:", users.length);
        users.forEach((user) => {
            console.log(`- ${user.name} (${user.email}): ${user.role} [ID: ${user._id}]`);
        });

        if (process.argv[2] === "make-admin" && process.argv[3]) {
            const email = process.argv[3];
            console.log(`\nUpdating role for ${email} to ADMIN...`);
            const result = await usersCollection.updateOne(
                { email: email },
                { $set: { role: "ADMIN" } }
            );
            console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

main();
