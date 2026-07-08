import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISchemeSlab {
    packs: number;
    bottles: number;
    discountPerPack: number;
    freeItems?: { productId: mongoose.Types.ObjectId; packs?: number; bottles?: number; qty: number }[];
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
    // Payment collection fields — extensible (add cardAmount, bankAmount, etc. here)
    upiAmount?: number;
    cashAmount?: number;
    expensesAmount?: number; // Miscellaneous expenses incurred during the trip
    receivedTotal?: number;
    balanceAmount?: number;  // grandTotal - receivedTotal (outstanding balance at time of verification)
    grandTotal?: number;    // stored for reference in balance calculations
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
        freeItems: [{
            productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
            packs: { type: Number, default: 0 },
            bottles: { type: Number, default: 0 },
            qty: { type: Number, required: true } // keeping qty as total bottles for legacy
        }]
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
        // Payment collection — add more payment method amounts here as needed
        upiAmount:      { type: Number, default: 0 },
        cashAmount:     { type: Number, default: 0 },
        expensesAmount: { type: Number, default: 0 }, // Miscellaneous expenses
        receivedTotal:  { type: Number, default: 0 },
        balanceAmount:  { type: Number, default: 0 },  // outstanding balance at verification
        grandTotal:     { type: Number, default: 0 },  // stored for balance calculations
    },
    { timestamps: true }
);

TripSchema.index({ warehouseId: 1, createdAt: -1 });
TripSchema.index({ warehouseId: 1, status: 1 });

const Trip: Model<ITrip> = mongoose.models.Trip || mongoose.model<ITrip>("Trip", TripSchema);

export default Trip;