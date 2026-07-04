import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRestockItem {
    productId: mongoose.Types.ObjectId;
    pack: string;
    flavour: string;
    bottlesPerPack: number;
    qtyAdded: number; // total bottles added
}

export interface IRestock extends Document {
    restockId: string;           // Human-readable: RST-20260704-0001
    warehouseId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    userName: string;
    warehouseName: string;
    items: IRestockItem[];
    status: "CONFIRMED";
    createdAt: Date;
    updatedAt: Date;
}

const RestockItemSchema = new Schema<IRestockItem>(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        pack: { type: String, default: "" },
        flavour: { type: String, default: "" },
        bottlesPerPack: { type: Number, default: 1 },
        qtyAdded: { type: Number, required: true },
    },
    { _id: false }
);

const RestockSchema: Schema<IRestock> = new Schema(
    {
        restockId: { type: String, required: true, unique: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        userName: { type: String, required: true },
        warehouseName: { type: String, required: true },
        items: [RestockItemSchema],
        status: { type: String, enum: ["CONFIRMED"], default: "CONFIRMED" },
    },
    { timestamps: true }
);

RestockSchema.index({ warehouseId: 1, createdAt: -1 });

const Restock: Model<IRestock> =
    (mongoose.models.Restock as Model<IRestock>) || mongoose.model<IRestock>("Restock", RestockSchema);

export default Restock;
