const mongoose = require('mongoose');

// Define Schemas
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    assignedWarehouses: [{
        warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
        expiresAt: Date
    }],
    activeWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }
}, { collection: 'users', timestamps: true });

const WarehouseSchema = new mongoose.Schema({
    name: String,
    isMain: Boolean
}, { collection: 'warehouses' });

async function resetAndDesignateAdmin() {
    const MONGODB_URI = "mongodb+srv://pandu:pandu22@cluster0.wywdega.mongodb.net/warehouse-mgmt-v2?retryWrites=true&w=majority";
    const adminEmail = "rkagencies321@gmail.com";
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const User = mongoose.model('User', UserSchema);
        const Warehouse = mongoose.model('Warehouse', WarehouseSchema);

        // 1. Delete all existing users
        const deleteResult = await User.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} users from the database.`);

        // 2. Fetch all warehouses to assign to admin
        const warehouses = await Warehouse.find({});
        console.log(`Found ${warehouses.length} warehouses to assign.`);

        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setFullYear(now.getFullYear() + 10); // 10 years access

        // 3. Create the new admin user
        const adminUser = new User({
            name: "RK Agencies",
            email: adminEmail,
            role: "ADMIN",
            assignedWarehouses: warehouses.map(w => ({
                warehouseId: w._id,
                expiresAt: expiresAt
            })),
            activeWarehouseId: warehouses.find(w => w.isMain)?._id || warehouses[0]?._id
        });

        await adminUser.save();
        console.log(`Primary Admin user created: ${adminUser.email}`);
        console.log(`Access granted to ${warehouses.length} warehouses for 10 years.`);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

resetAndDesignateAdmin();
