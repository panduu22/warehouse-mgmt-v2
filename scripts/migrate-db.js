const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const OLD_URI = "mongodb+srv://pandu:pandu22@cluster0.wywdega.mongodb.net/warehouse-mgmt?retryWrites=true&w=majority";
const NEW_URI = process.env.MONGODB_URI;

if (!NEW_URI) {
    console.error("Please define MONGODB_URI in .env.local (should be the new DB URI)");
    process.exit(1);
}

// Minimal schemas for migration
const userSchema = new mongoose.Schema({}, { strict: false });
const productSchema = new mongoose.Schema({}, { strict: false });
const vehicleSchema = new mongoose.Schema({}, { strict: false });
const tripSchema = new mongoose.Schema({}, { strict: false });
const billSchema = new mongoose.Schema({}, { strict: false });
const warehouseSchema = new mongoose.Schema({
    name: String,
    isMain: Boolean,
    createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true, strict: false });

async function migrate() {
    console.log("Connecting to old DB...");
    const oldDb = await mongoose.createConnection(OLD_URI).asPromise();
    console.log("Connected to old DB.");

    console.log("Connecting to new DB...");
    const newDb = await mongoose.createConnection(NEW_URI).asPromise();
    console.log("Connected to new DB.");

    try {
        // Models
        const OldUser = oldDb.model("User", userSchema);
        const OldProduct = oldDb.model("Product", productSchema);
        const OldVehicle = oldDb.model("Vehicle", vehicleSchema);
        const OldTrip = oldDb.model("Trip", tripSchema);
        const OldBill = oldDb.model("Bill", billSchema);

        const NewUser = newDb.model("User", userSchema);
        const NewProduct = newDb.model("Product", productSchema);
        const NewVehicle = newDb.model("Vehicle", vehicleSchema);
        const NewTrip = newDb.model("Trip", tripSchema);
        const NewBill = newDb.model("Bill", billSchema);
        const NewWarehouse = newDb.model("Warehouse", warehouseSchema);

        console.log("Clearing new DB collections (to avoid duplicates during migration)...");
        await Promise.all([
            NewUser.deleteMany({}),
            NewProduct.deleteMany({}),
            NewVehicle.deleteMany({}),
            NewTrip.deleteMany({}),
            NewBill.deleteMany({}),
            NewWarehouse.deleteMany({}),
        ]);

        console.log("Copying Users...");
        const users = await OldUser.find({}).lean();
        if (users.length > 0) await NewUser.insertMany(users);
        console.log(`Migrated ${users.length} users.`);

        // Find an admin to be the creator of the warehouse, or just use the first user
        let adminUser = await NewUser.findOne({ role: "ADMIN" });
        if (!adminUser && users.length > 0) adminUser = await NewUser.findOne({});

        console.log("Creating Main Warehouse...");
        const mainWarehouse = await NewWarehouse.create({
            name: "Main Warehouse",
            isMain: true,
            createdBy: adminUser ? adminUser._id : new mongoose.Types.ObjectId()
        });
        console.log(`Created Main Warehouse with ID: ${mainWarehouse._id}`);

        // Set all users to have this as active warehouse
        await NewUser.updateMany({}, { $set: { activeWarehouseId: mainWarehouse._id } });

        console.log("Copying Vehicles...");
        const vehicles = await OldVehicle.find({}).lean();
        if (vehicles.length > 0) await NewVehicle.insertMany(vehicles);
        console.log(`Migrated ${vehicles.length} vehicles.`);

        console.log("Copying Products and linking to Main Warehouse...");
        const products = await OldProduct.find({}).lean();
        const productsWithWarehouse = products.map(p => ({ ...p, warehouseId: mainWarehouse._id }));
        if (productsWithWarehouse.length > 0) await NewProduct.insertMany(productsWithWarehouse);
        console.log(`Migrated ${products.length} products.`);

        console.log("Copying Trips and linking to Main Warehouse...");
        const trips = await OldTrip.find({}).lean();
        const tripsWithWarehouse = trips.map(t => ({ ...t, warehouseId: mainWarehouse._id }));
        if (tripsWithWarehouse.length > 0) await NewTrip.insertMany(tripsWithWarehouse);
        console.log(`Migrated ${trips.length} trips.`);

        console.log("Copying Bills and linking to Main Warehouse...");
        const bills = await OldBill.find({}).lean();
        const billsWithWarehouse = bills.map(b => ({ ...b, warehouseId: mainWarehouse._id }));
        if (billsWithWarehouse.length > 0) await NewBill.insertMany(billsWithWarehouse);
        console.log(`Migrated ${bills.length} bills.`);

        console.log("----------");
        console.log("Migration Complete!");

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await oldDb.close();
        await newDb.close();
        process.exit(0);
    }
}

migrate();
