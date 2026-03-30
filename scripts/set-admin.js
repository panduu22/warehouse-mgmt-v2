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

    const email = "rkagencies321@gmail.com";
    const oldAdminEmail = "23bcs068@iiitdwd.ac.in";

    // 1. Demote old admin if exists
    const oldAdmin = await User.findOne({ email: oldAdminEmail });
    if (oldAdmin) {
        console.log("Found old admin:", oldAdmin.email, "Demoting to STAFF...");
        oldAdmin.role = "STAFF";
        await oldAdmin.save();
    }

    // 2. Promote new admin
    const user = await User.findOne({ email });

    if (user) {
        console.log("Found user:", user.email, "Current Role:", user.role);
        user.role = "ADMIN";
        
        // Grant access to all warehouses with indefinite expiration (100 years)
        const warehouses = await mongoose.model('Warehouse', new Schema({}, { strict: false })).find({});
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 100);

        user.assignedWarehouses = warehouses.map(w => ({
            warehouseId: w._id,
            expiresAt: farFuture
        }));

        await user.save();
        console.log("Updated role to ADMIN and granted indefinite access.");
    } else {
        console.log("New admin user not found via email. Creating...");
        // Upsert the user as requested
        const newUser = await User.findOneAndUpdate(
            { email },
            {
                name: "RK Agencies",
                email: email,
                role: "ADMIN",
                // Initial assignments will be handled on login or via migrate-v2 if needed
            },
            { upsert: true, new: true }
        );
        console.log("Upserted new Admin User:", newUser.email);
    }

    await mongoose.disconnect();
}

main().catch(console.error);
