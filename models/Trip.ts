import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISchemeSlab {
    packs: number;
    bottles: number;
    discountPerPack: number;
}

export interface ITripItem {
    productId: mongoose.Types.ObjectId;
    qtyLoaded: number;
    qtyReturned: number;
    qtyScheme?: number; // Legacy: Bottles sold under scheme
    discountPerPack?: number; // Legacy: Discount in ₹ per pack
    schemes?: ISchemeSlab[]; // New: Multiple scheme slabs
    qtySold?: number; // Calculated: Loaded - Returned
}

export interface ITrip extends Document {
    vehicleId: mongoose.Types.ObjectId;
    loadedItems: ITripItem[];
    status: "LOADED" | "RETURNED" | "VERIFIED";
    startTime: Date;
    endTime?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TripItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    qtyLoaded: { type: Number, required: true },
    qtyReturned: { type: Number, default: 0 },
    qtyScheme: { type: Number, default: 0 },
    discountPerPack: { type: Number, default: 0 },
    schemes: [{
        packs: { type: Number, required: true },
        bottles: { type: Number, required: true },
        discountPerPack: { type: Number, required: true },
    }],
}, { _id: false });

const TripSchema: Schema<ITrip> = new Schema(
    {
        vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
        loadedItems: [TripItemSchema],
        status: {
            type: String,
            enum: ["LOADED", "RETURNED", "VERIFIED"],
            default: "LOADED"
        },
        startTime: { type: Date, default: Date.now },
        endTime: { type: Date },
        verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    },
    { timestamps: true }
);

const Trip: Model<ITrip> = mongoose.models.Trip || mongoose.model<ITrip>("Trip", TripSchema);

export default Trip;
