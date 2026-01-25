const mongoose = require('mongoose');
const { Schema } = mongoose;

const MONGODB_URI = "mongodb+srv://pandu:pandu22@cluster0.wywdega.mongodb.net/warehouse-mgmt?retryWrites=true&w=majority";

const UserSchema = new Schema({
    name: String,
    email: String,
    role: String
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to DB");

    const email = "23bcs068@iiitdwd.ac.in"; // User from prompt
    const user = await User.findOne({ email });

    if (user) {
        console.log("Found user:", user.email, "Current Role:", user.role);
        user.role = "ADMIN";
        await user.save();
        console.log("Updated role to ADMIN");
    } else {
        console.log("User not found via email, trying ID...");
        // ID from prompt: 6973ac23b00976ad92378fbd (This looks like a valid ObjectID hex but verify length is 24 chars)
        // 6973ac23b00976ad92378fbd is 24 chars.
        try {
            const userById = await User.findById("6973ac23b00976ad92378fbd");
            if (userById) {
                console.log("Found user by ID:", userById.email);
                userById.role = "ADMIN";
                await userById.save();
                console.log("Updated role to ADMIN");
            } else {
                console.log("User not found by ID either. Creating placeholder if needed or wait for login.");
                // User said "for this user account...". If they logged in, they exist. 
                // If they haven't logged in yet, I might need to create it.
                // The prompt data looks like a DB dump or JSON.
                // It has `_id`. So it exists in some DB? Or they want me to create it.
                // Prompt: "for this user account... put check there is this data/stock.xlx put all the data in the this users account"
                // I will upsert the user.

                const newUser = await User.findOneAndUpdate(
                    { email },
                    {
                        _id: new mongoose.Types.ObjectId("6973ac23b00976ad92378fbd"),
                        name: "KOPURI HEMADITHYA IIIT Dharwad",
                        email: email,
                        image: "https://lh3.googleusercontent.com/a/ACg8ocKpKSYhsX4gthousFwyY-HAL7seq9…",
                        role: "ADMIN",
                        createdAt: new Date("2026-01-23T17:13:07.398Z"),
                        updatedAt: new Date("2026-01-23T17:13:07.398Z")
                    },
                    { upsert: true, new: true }
                );
                console.log("Upserted User:", newUser.email);
            }
        } catch (e) { console.error("Error finding by ID", e); }
    }

    await mongoose.disconnect();
}

main().catch(console.error);
