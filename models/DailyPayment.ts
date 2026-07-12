import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * DailyPayment – stores manually-entered paid amounts per warehouse per date.
 * Each entry represents one payment record saved by a user for a specific date.
 * Multiple entries can exist for the same (warehouseId, date) combination;
 * they are all summed when calculating the total for a date range.
 */
export interface IDailyPayment extends Document {
    warehouseId: mongoose.Types.ObjectId;
    /** Calendar date in ISO format, e.g. "2026-07-13" (IST local date) */
    date: string;
    amount: number;
    note?: string;
    userId: mongoose.Types.ObjectId;
    userName: string;
    createdAt: Date;
    updatedAt: Date;
}

const DailyPaymentSchema: Schema<IDailyPayment> = new Schema(
    {
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
        date: { type: String, required: true }, // "YYYY-MM-DD"
        amount: { type: Number, required: true, min: 0 },
        note: { type: String, default: "" },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        userName: { type: String, required: true },
    },
    { timestamps: true }
);

DailyPaymentSchema.index({ warehouseId: 1, date: 1 });

const DailyPayment: Model<IDailyPayment> =
    (mongoose.models.DailyPayment as Model<IDailyPayment>) ||
    mongoose.model<IDailyPayment>("DailyPayment", DailyPaymentSchema);

export default DailyPayment;
