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

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await dbConnect();

        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date"); // YYYY-MM-DD for daily balance

        // Warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
            else warehouseId = undefined;
        }

        const warehouseFilter = warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {};

        // Date range for "daily balance"
        const dayStr = dateParam || new Date().toISOString().split("T")[0];
        const dayStart = new Date(`${dayStr}T00:00:00.000Z`);
        const dayEnd   = new Date(`${dayStr}T23:59:59.999Z`);

        // Fetch all vehicles in warehouse
        const vehicles = await Vehicle.find(warehouseId ? { warehouseId } : {}).lean();

        // Aggregate: all verified trips with balance > 0 for this warehouse
        const tripsWithBalance = await Trip.find({
            ...warehouseFilter,
            status: "VERIFIED",
            balanceAmount: { $gt: 0 }
        }).select("vehicleId balanceAmount grandTotal endTime createdAt").lean();

        // Aggregate: daily trips (verified on the selected day)
        const dailyTrips = await Trip.find({
            ...warehouseFilter,
            status: "VERIFIED",
            $or: [
                { endTime: { $gte: dayStart, $lte: dayEnd } },
                { createdAt: { $gte: dayStart, $lte: dayEnd } }
            ]
        }).select("vehicleId balanceAmount grandTotal").lean();

        // Aggregate: all VehiclePayments collected for this warehouse
        const allPayments = await VehiclePayment.find(warehouseFilter).select("vehicleId amount").lean();

        // Build per-vehicle balance maps
        const outstandingByVehicle: Record<string, number> = {};
        const dailyBalanceByVehicle: Record<string, number> = {};
        const paymentsCollectedByVehicle: Record<string, number> = {};

        // Sum balance from verified trips
        for (const t of tripsWithBalance as any[]) {
            const vid = t.vehicleId?.toString();
            if (!vid) continue;
            outstandingByVehicle[vid] = (outstandingByVehicle[vid] || 0) + (t.balanceAmount || 0);
        }

        // Sum daily balance
        for (const t of dailyTrips as any[]) {
            const vid = t.vehicleId?.toString();
            if (!vid) continue;
            dailyBalanceByVehicle[vid] = (dailyBalanceByVehicle[vid] || 0) + (t.balanceAmount || 0);
        }

        // Sum payments collected (reduces outstanding)
        for (const p of allPayments as any[]) {
            const vid = p.vehicleId?.toString();
            if (!vid) continue;
            paymentsCollectedByVehicle[vid] = (paymentsCollectedByVehicle[vid] || 0) + (p.amount || 0);
        }

        // Build result
        const result = vehicles.map((v: any) => {
            const vid = v._id.toString();
            const rawOutstanding = outstandingByVehicle[vid] || 0;
            const collected = paymentsCollectedByVehicle[vid] || 0;
            const totalOutstanding = Math.max(0, Math.round((rawOutstanding - collected) * 100) / 100);
            const dailyBalance = Math.round((dailyBalanceByVehicle[vid] || 0) * 100) / 100;

            return {
                _id: vid,
                number: v.number,
                driverName: v.driverName,
                dailyBalance,
                totalOutstandingBalance: totalOutstanding,
            };
        });

        return NextResponse.json({ data: result, date: dayStr });
    } catch (error) {
        console.error("Vehicle Balance Error:", error);
        return NextResponse.json({ error: "Failed to fetch vehicle balances" }, { status: 500 });
    }
}
