import dbConnect from "./mongodb";
import Activity from "@/models/Activity";
import mongoose from "mongoose";

interface LogPayload {
    userId: string;
    warehouseId: string;
    action: string;
    details: string;
    targetId?: string;
    targetModel?: "Product" | "Vehicle" | "Trip" | "Bill";
}

export async function logActivity(payload: LogPayload) {
    try {
        await dbConnect();
        
        // Ensure valid ObjectIds to prevent Mongoose cast errors
        const activityData: any = {
            userId: new mongoose.Types.ObjectId(payload.userId),
            warehouseId: new mongoose.Types.ObjectId(payload.warehouseId),
            action: payload.action,
            details: payload.details,
        };

        if (payload.targetId && payload.targetModel && mongoose.Types.ObjectId.isValid(payload.targetId)) {
            activityData.targetId = new mongoose.Types.ObjectId(payload.targetId);
            activityData.targetModel = payload.targetModel;
        }

        await Activity.create(activityData);
        // Fire-and-forget, no need to await success or block the main request
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
