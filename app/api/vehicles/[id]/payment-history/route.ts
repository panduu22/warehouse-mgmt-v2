import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VehiclePayment from "@/models/VehiclePayment";
import Vehicle from "@/models/Vehicle";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";

export const dynamic = "force-dynamic";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: vehicleId } = await params;
        await dbConnect();

        // Warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
        }

        // Validate vehicle
        const vehicle = await Vehicle.findOne({
            _id: vehicleId,
            ...(warehouseId ? { warehouseId } : {}),
        }).lean();
        if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

        const payments = await VehiclePayment.find({
            vehicleId: new mongoose.Types.ObjectId(vehicleId),
            ...(warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {}),
        })
            .sort({ collectedAt: -1 })
            .populate("collectedBy", "name email")
            .populate("tripId", "_id startTime endTime")
            .lean();

        return NextResponse.json({ payments });
    } catch (error) {
        console.error("Payment History Error:", error);
        return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
    }
}
