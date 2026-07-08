import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import Vehicle from "@/models/Vehicle";
import VehiclePayment from "@/models/VehiclePayment";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id: vehicleId } = await params;
        const { amount, paymentMethod, remarks, tripId } = await req.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
        }
        if (!["CASH", "UPI"].includes(paymentMethod)) {
            return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
        }

        await dbConnect();

        // Warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        // Validate vehicle belongs to warehouse
        const vehicle = await Vehicle.findOne({ _id: vehicleId, warehouseId });
        if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

        // Calculate current outstanding balance for this vehicle
        const tripsWithBalance = await Trip.find({
            vehicleId: new mongoose.Types.ObjectId(vehicleId),
            warehouseId: new mongoose.Types.ObjectId(warehouseId),
            status: "VERIFIED",
            balanceAmount: { $gt: 0 }
        }).select("balanceAmount").lean();

        const allPayments = await VehiclePayment.find({
            vehicleId: new mongoose.Types.ObjectId(vehicleId),
            warehouseId: new mongoose.Types.ObjectId(warehouseId),
        }).select("amount").lean();

        const totalBalance = (tripsWithBalance as any[]).reduce((sum, t) => sum + (t.balanceAmount || 0), 0);
        const totalCollected = (allPayments as any[]).reduce((sum, p) => sum + (p.amount || 0), 0);
        const currentOutstanding = Math.max(0, totalBalance - totalCollected);

        if (Math.round(amount * 100) > Math.round(currentOutstanding * 100)) {
            return NextResponse.json({
                error: `Payment amount ₹${amount.toFixed(2)} exceeds outstanding balance ₹${currentOutstanding.toFixed(2)}`
            }, { status: 400 });
        }

        // Create payment record
        const userId = (session.user as any).id || (session.user as any)._id;
        const payment = await VehiclePayment.create({
            vehicleId: new mongoose.Types.ObjectId(vehicleId),
            warehouseId: new mongoose.Types.ObjectId(warehouseId),
            tripId: tripId ? new mongoose.Types.ObjectId(tripId) : undefined,
            amount: Math.round(amount * 100) / 100,
            paymentMethod,
            remarks: remarks || "",
            collectedBy: new mongoose.Types.ObjectId(userId),
            collectedAt: new Date(),
        });

        const newOutstanding = Math.max(0, Math.round((currentOutstanding - amount) * 100) / 100);

        await logActivity({
            userId,
            warehouseId,
            action: "COLLECT_BALANCE",
            details: `Collected ₹${amount.toFixed(2)} via ${paymentMethod} from vehicle ${vehicle.number}. Remaining: ₹${newOutstanding.toFixed(2)}`,
            targetId: payment._id.toString(),
            targetModel: "VehiclePayment",
        });

        return NextResponse.json({
            success: true,
            payment,
            newOutstandingBalance: newOutstanding,
        }, { status: 201 });
    } catch (error) {
        console.error("Collect Balance Error:", error);
        return NextResponse.json({ error: "Failed to collect balance" }, { status: 500 });
    }
}
