import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVehicle extends Document {
    number: string;
    driverName: string;
    status: "AVAILABLE" | "IN_TRANSIT" | "MAINTENANCE";
    createdAt: Date;
    updatedAt: Date;
}

const VehicleSchema: Schema<IVehicle> = new Schema(
    {
        number: { type: String, required: true, unique: true },
        driverName: { type: String, required: true },
        status: {
            type: String,
            enum: ["AVAILABLE", "IN_TRANSIT", "MAINTENANCE"],
            default: "AVAILABLE"
        },
    },
    { timestamps: true }
);

const Vehicle: Model<IVehicle> = mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
