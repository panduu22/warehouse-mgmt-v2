import mongoose from "mongoose";
import User from "../models/User";
import AccessRequest from "../models/AccessRequest";

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    const requests = await AccessRequest.find({ status: "APPROVED" });
    for (const req of requests) {
        const user = await User.findById(req.userId);
        if (user) {
            user.assignedWarehouses = user.assignedWarehouses || [];
            
            const existingIndex = user.assignedWarehouses.findIndex(
                (w: any) => w.warehouseId.toString() === req.warehouseId.toString()
            );

            if (existingIndex < 0) {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + (req.requestedDuration || 30));
                
                user.assignedWarehouses.push({
                    warehouseId: req.warehouseId,
                    expiresAt
                });

                if (!user.activeWarehouseId) {
                    user.activeWarehouseId = req.warehouseId;
                }
                
                await user.save();
                console.log(`Fixed user: ${user.email} for warehouse ${req.warehouseId}`);
            }
        }
    }

    console.log("Done");
    process.exit(0);
}

fix();
