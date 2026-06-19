import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import Trip from "@/models/Trip";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";

export const dynamic = "force-dynamic";

function toLocalDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const timeframe = url.searchParams.get("timeframe") || "weekly"; // "weekly" | "monthly" | "all"

        // Warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
            else warehouseId = undefined;
        }

        // Date range based on timeframe (using local time so it matches IST calendar)
        const now = new Date();
        let startDate: Date | null = null;

        if (timeframe === "weekly") {
            // Monday of current week
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(now);
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);
        } else if (timeframe === "monthly") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        }
        // "all" → no date filter

        // Fetch all vehicles for warehouse
        const vehicleFilter: any = {};
        if (warehouseId) vehicleFilter.warehouseId = warehouseId;
        const vehicles = await Vehicle.find(vehicleFilter).sort({ createdAt: -1 }).lean();

        // Build trip filter
        const tripFilter: any = { status: "VERIFIED" };
        if (warehouseId) tripFilter.warehouseId = warehouseId;
        if (startDate) {
            tripFilter.$or = [
                { startTime: { $gte: startDate } },
                { createdAt: { $gte: startDate } },
            ];
        }

        // Fetch all relevant trips with product data
        const trips = await Trip.find(tripFilter)
            .populate("loadedItems.productId")
            .lean();

        // Aggregate sales per vehicle
        const salesByVehicle: Record<string, { totalSales: number; totalBottles: number; tripCount: number }> = {};

        for (const trip of trips) {
            const vid = trip.vehicleId?.toString();
            if (!vid) continue;

            if (!salesByVehicle[vid]) {
                salesByVehicle[vid] = { totalSales: 0, totalBottles: 0, tripCount: 0 };
            }

            salesByVehicle[vid].tripCount += 1;

            for (const item of trip.loadedItems as any[]) {
                const product = item.productId;
                if (!product) continue;
                const soldQty = (item.qtyLoaded || 0) - (item.qtyReturned || 0);
                if (soldQty > 0) {
                    const bpp = product.bottlesPerPack || 1;
                    const soldPacks = Math.floor(soldQty / bpp);
                    salesByVehicle[vid].totalSales += soldPacks * (product.salePrice || 0);
                    salesByVehicle[vid].totalBottles += soldQty;
                }
            }
        }

        // Build response — attach sales summary to each vehicle
        const result = vehicles.map((v: any) => {
            const stats = salesByVehicle[v._id.toString()] || { totalSales: 0, totalBottles: 0, tripCount: 0 };
            return {
                _id: v._id,
                number: v.number,
                driverName: v.driverName,
                ...stats,
            };
        });

        // Sort by totalSales descending
        result.sort((a, b) => b.totalSales - a.totalSales);

        return NextResponse.json({ data: result, timeframe });
    } catch (error) {
        console.error("Vehicle Sales Summary Error:", error);
        return NextResponse.json({ error: "Failed to fetch vehicle sales summary" }, { status: 500 });
    }
}
