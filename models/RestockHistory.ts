import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRestockProductSnapshot {
    productId: mongoose.Types.ObjectId;
    productNameSnapshot: string;
    flavourSnapshot?: string;
    packSizeSnapshot?: string;
    casesRestocked: number;
    bottlesRestocked: number;
    bottlesPerPack: number;
    invoiceCostPerCase: number;
    caseCost: number;
    bottleCost: number;
    totalCost: number;
}

export interface IRestockHistory extends Document {
    transactionId: string;
    warehouseId: mongoose.Types.ObjectId;
    warehouseName: string;
    createdBy: {
        userId: mongoose.Types.ObjectId;
        userName: string;
        userEmail?: string;
    };
    restockDate: string; // YYYY-MM-DD in Asia/Kolkata
    restockTime: string; // e.g. "04:30 PM" in Asia/Kolkata
    products: IRestockProductSnapshot[];
    totalProducts: number;
    totalCases: number;
    totalBottles: number;
    grandTotal: number;
    createdAt: Date;
    updatedAt: Date;
}

const RestockProductSnapshotSchema = new Schema<IRestockProductSnapshot>(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productNameSnapshot: { type: String, required: true },
        flavourSnapshot: { type: String, default: "" },
        packSizeSnapshot: { type: String, default: "" },
        casesRestocked: { type: Number, required: true, min: 0, default: 0 },
        bottlesRestocked: { type: Number, required: true, min: 0, default: 0 },
        bottlesPerPack: { type: Number, required: true, min: 1, default: 24 },
        invoiceCostPerCase: { type: Number, required: true, default: 0 },
        caseCost: { type: Number, required: true, default: 0 },
        bottleCost: { type: Number, required: true, default: 0 },
        totalCost: { type: Number, required: true, default: 0 },
    },
    { _id: false }
);

const RestockHistorySchema: Schema<IRestockHistory> = new Schema(
    {
        transactionId: { type: String, required: true, unique: true, index: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
        warehouseName: { type: String, required: true },
        createdBy: {
            userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
            userName: { type: String, required: true },
            userEmail: { type: String, default: "" },
        },
        restockDate: { type: String, required: true, index: true },
        restockTime: { type: String, required: true },
        products: { type: [RestockProductSnapshotSchema], required: true },
        totalProducts: { type: Number, required: true, default: 0 },
        totalCases: { type: Number, required: true, default: 0 },
        totalBottles: { type: Number, required: true, default: 0 },
        grandTotal: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

RestockHistorySchema.index({ warehouseId: 1, createdAt: -1 });
RestockHistorySchema.index({ warehouseId: 1, restockDate: -1 });
RestockHistorySchema.index({ "products.productNameSnapshot": 1 });
RestockHistorySchema.index({ "products.flavourSnapshot": 1 });

const RestockHistory: Model<IRestockHistory> =
    (mongoose.models.RestockHistory as Model<IRestockHistory>) ||
    mongoose.model<IRestockHistory>("RestockHistory", RestockHistorySchema);

export default RestockHistory;

