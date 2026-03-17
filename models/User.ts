import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    image?: string;
    role: "ADMIN" | "STAFF";
    activeWarehouseId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        image: { type: String },
        role: { type: String, enum: ["ADMIN", "STAFF"], default: "STAFF" },
        activeWarehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    },
    { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
