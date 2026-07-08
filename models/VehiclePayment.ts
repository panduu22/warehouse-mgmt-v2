import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVehiclePayment extends Document {
    vehicleId: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;
    tripId?: mongoose.Types.ObjectId;       // optional — for attribution to specific trip balance
    amount: number;
    paymentMethod: "CASH" | "UPI";
    remarks?: string;
    collectedBy: mongoose.Types.ObjectId;   // userId
    collectedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const VehiclePaymentSchema: Schema<IVehiclePayment> = new Schema(
    {
        vehicleId:     { type: Schema.Types.ObjectId, ref: "Vehicle",   required: true },
        warehouseId:   { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
        tripId:        { type: Schema.Types.ObjectId, ref: "Trip" },
        amount:        { type: Number, required: true, min: 0 },
        paymentMethod: { type: String, enum: ["CASH", "UPI"], required: true },
        remarks:       { type: String, default: "" },
        collectedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
        collectedAt:   { type: Date, default: Date.now },
    },
    { timestamps: true }
);

VehiclePaymentSchema.index({ vehicleId: 1, warehouseId: 1, collectedAt: -1 });
VehiclePaymentSchema.index({ warehouseId: 1, collectedAt: -1 });

const VehiclePayment: Model<IVehiclePayment> =
    mongoose.models.VehiclePayment ||
    mongoose.model<IVehiclePayment>("VehiclePayment", VehiclePaymentSchema);

export default VehiclePayment;
