import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb';
import User from '../models/User';
import Warehouse from '../models/Warehouse';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function resetUsers(adminEmail: string) {
    try {
        await dbConnect();
        console.log('Connected to MongoDB');

        // 1. Delete all existing users
        const deleteResult = await User.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} users from the database.`);

        // 2. Fetch all warehouses to assign to admin
        const warehouses = await Warehouse.find({});
        console.log(`Found ${warehouses.length} warehouses to assign.`);

        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setFullYear(now.getFullYear() + 10); // 10 years access for admin

        // 3. Create the new admin user
        const adminUser = new User({
            name: "rk agencies",
            email: adminEmail,
            role: "ADMIN",
            assignedWarehouses: warehouses.map(w => ({
                warehouseId: w._id,
                expiresAt: expiresAt
            })),
            activeWarehouseId: warehouses.find(w => w.isMain)?._id || warehouses[0]?._id
        });

        await adminUser.save();
        console.log(`Admin user created: ${adminUser.email} with role: ${adminUser.role}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error during reset:', error);
        process.exit(1);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: ts-node scripts/reset-users.ts <admin-email>');
    process.exit(1);
}

resetUsers(email);
