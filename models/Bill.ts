import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBill extends Document {
    tripId: mongoose.Types.ObjectId;
    totalAmount: number;
    generatedBy: mongoose.Types.ObjectId;
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const BillSchema: Schema<IBill> = new Schema(
    {
        tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, unique: true },
        totalAmount: { type: Number, required: true },
        generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        generatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);

export default Bill;
