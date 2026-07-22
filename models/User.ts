import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    image?: string;
    role: "SUPER_ADMIN" | "WAREHOUSE_ADMIN" | "STAFF";
    activeWarehouseId?: mongoose.Types.ObjectId;
    warehouseAdminOf?: mongoose.Types.ObjectId;
    assignedWarehouses: {
        warehouseId: mongoose.Types.ObjectId;
        grantedAt?: Date;
        expiresAt?: Date;
    }[];
    password?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        image: { type: String },
        role: { type: String, enum: ["SUPER_ADMIN", "WAREHOUSE_ADMIN", "STAFF"], default: "STAFF" },
        activeWarehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse" },
        // If the user is a Warehouse Admin, reference the warehouse they manage
        warehouseAdminOf: { type: Schema.Types.ObjectId, ref: "Warehouse", required: false },
        assignedWarehouses: [{
            warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
            grantedAt: { type: Date },
            expiresAt: { type: Date }
        }],
        password: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
