import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAccessRequest extends Document {
  userId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  requestedDuration?: number; // In days
  adminNotes?: string;
  approvedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccessRequestSchema: Schema<IAccessRequest> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"], default: "PENDING" },
    requestedDuration: { type: Number },
    adminNotes: { type: String },
    approvedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

const AccessRequest: Model<IAccessRequest> = mongoose.models.AccessRequest || mongoose.model<IAccessRequest>("AccessRequest", AccessRequestSchema);

export default AccessRequest;
