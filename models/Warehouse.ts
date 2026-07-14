import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWarehouse extends Document {
    name: string;
    address?: string;
    isMain: boolean;
    createdBy: mongoose.Types.ObjectId;
    adminId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const WarehouseSchema: Schema<IWarehouse> = new Schema(
    {
        name: { type: String, required: true },
        address: { type: String },
        isMain: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        // Optional reference to the Warehouse Admin
        adminId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    },
    { timestamps: true }
);

WarehouseSchema.index({ adminId: 1 }, { unique: true, sparse: true });
WarehouseSchema.index({ isMain: 1 }, { sparse: true });

const Warehouse: Model<IWarehouse> = mongoose.models.Warehouse || mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);

export default Warehouse;
