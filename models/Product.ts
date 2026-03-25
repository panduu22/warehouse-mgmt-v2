import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
    name: string;
    sku: string;
    quantity: number;
    price: number;
    location?: string;
    pack?: string;
    flavour?: string;
    mrp?: number;
    invoiceCost?: number;
    warehouseId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
    {
        name: { type: String, required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, default: 0 },
        price: { type: Number, required: true, default: 0 },
        location: { type: String },
        pack: { type: String },
        flavour: { type: String },
        mrp: { type: Number },
        invoiceCost: { type: Number },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    },
    { timestamps: true }
);

ProductSchema.index({ warehouseId: 1, sku: 1 }, { unique: true });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
