import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBillItemScheme {
    qty: number; // Bottles
    price: number; // ₹ per pack
    discount: number; // total ₹ discount for this slab
    freeItems?: { productId: string, productName: string, qty: number, bottlesPerPack: number }[];
}

export interface IBillItem {
    name: string;
    pack: string;
    flavour: string;
    normalQty: number; // Bottles
    schemeQty: number; // Bottles (Total)
    normalPrice: number; // ₹ per pack
    schemePrice: number; // ₹ per pack (Legacy/Average)
    discount: number; // Total ₹ discount for this line
    schemes?: IBillItemScheme[]; // New: Detailed scheme slabs
    total: number; // Normal Total + Scheme Total
    bottlesPerPack: number;
}

export interface IBill extends Document {
    tripId: mongoose.Types.ObjectId;
    items: IBillItem[];
    totalAmount: number;
    generatedBy: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const BillItemSchema = new Schema({
    name: { type: String, required: true },
    pack: { type: String, required: true },
    flavour: { type: String, required: true },
    normalQty: { type: Number, required: true },
    schemeQty: { type: Number, required: true },
    normalPrice: { type: Number, required: true },
    schemePrice: { type: Number, required: true },
    discount: { type: Number, required: true },
    schemes: [{
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, required: true },
        freeItems: [{
            productId: { type: String, required: true },
            productName: { type: String, required: true },
            qty: { type: Number, required: true },
            bottlesPerPack: { type: Number, required: true }
        }]
    }],
    total: { type: Number, required: true },
    bottlesPerPack: { type: Number, required: true },
}, { _id: false });

const BillSchema: Schema<IBill> = new Schema(
    {
        tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, unique: true },
        items: [BillItemSchema],
        totalAmount: { type: Number, required: true },
        generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
        generatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);

export default Bill;
