import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivity extends Document {
    userId: mongoose.Types.ObjectId;
    warehouseId?: mongoose.Types.ObjectId;
    action: string;
    details: string;
    targetId?: mongoose.Types.ObjectId;
    targetModel?: "Product" | "Vehicle" | "Trip" | "Bill" | "User" | "Warehouse" | "AccessRequest" | "VehiclePayment";
    createdAt: Date;
    updatedAt: Date;
}

const ActivitySchema: Schema<IActivity> = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse" },
        action: { type: String, required: true }, // e.g., "EDIT_PRODUCT", "LOAD_VEHICLE", "GENERATE_BILL", "CREATE_PRODUCT"
        details: { type: String, required: true }, // Human readable summary, e.g. "Updated price of Coca Cola to 50"
        targetId: { type: Schema.Types.ObjectId },
        targetModel: { type: String, enum: ["Product", "Vehicle", "Trip", "Bill", "User", "Warehouse", "AccessRequest", "VehiclePayment"] },
    },
    { timestamps: true }
);

ActivitySchema.index({ warehouseId: 1, createdAt: -1 });

const Activity: Model<IActivity> = mongoose.models.Activity || mongoose.model<IActivity>("Activity", ActivitySchema);

export default Activity;
