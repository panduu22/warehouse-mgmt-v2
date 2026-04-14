import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Trip from "@/models/Trip";
import Bill from "@/models/Bill";
import { Package, Truck, Receipt, MoreHorizontal, ArrowRight, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import DashboardDateFilter from "@/components/DashboardDateFilter";
import Warehouse from "@/models/Warehouse";
import Vehicle from "@/models/Vehicle"; // Import to ensure model is registered for populate
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { parsePack } from "@/lib/stock-utils";

async function getData(dateFilter?: string) {
    await dbConnect();

    const dateQuery = dateFilter ? {
        $gte: new Date(dateFilter),
        $lt: new Date(new Date(dateFilter).getTime() + 24 * 60 * 60 * 1000)
    } : null;

    // Get active warehouse context
    const cookieStore = await cookies();
    let warehouseId = cookieStore.get("activeWarehouseId")?.value;
    let warehouseName = cookieStore.get("activeWarehouseName")?.value || "Main Warehouse";
    
    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
        const main = await Warehouse.findOne({ isMain: true });
        if (main) {
            warehouseId = main._id.toString();
            warehouseName = main.name;
        } else {
            warehouseId = undefined; // Ensure it's not an invalid string
        }
    }
    
    const filter = warehouseId ? { warehouseId } : {};

    // Calculate detailed stock metrics
    const products = await Product.find(filter);
    let totalBottlesRaw = 0;
    let totalPacksRaw = 0;
    let totalRemainderBottles = 0;
    let totalValuePrecision = 0;

    products.forEach(p => {
        const qty = p.quantity || 0;
        const bpp = p.bottlesPerPack;
        const price = p.price || p.salePrice || 0;

        totalBottlesRaw += qty;
        totalPacksRaw += Math.floor(qty / bpp);
        totalRemainderBottles += qty % bpp;
        // Proportional value: (Total Bottles / BPP) * Price
        // Using large multiplier to maintain precision before final rounding
        totalValuePrecision += (qty * price) / bpp;
    });

    const totalValue = totalValuePrecision;

    // Logic Switch:
    // Global (No Date):
    // - Active Trips: Status != VERIFIED (Current in-transit)
    // - Invoices: Total All Time

    // Date Selected:
    // - Active Trips -> Trips Started on Date
    // - Invoices -> Invoices Generated on Date

    const tripQuery = dateFilter ? { ...filter, startTime: dateQuery } : { ...filter, status: { $ne: "VERIFIED" } };
    const billQuery = dateFilter ? { ...filter, generatedAt: dateQuery } : { ...filter };
    const activityQuery = dateFilter ? { ...filter, updatedAt: dateQuery } : { ...filter };
    // If date selected, maybe show ALL activity for that date? Or still limit? 
    // Let's show all for that date (or limit 20).

    // Calculate total stock (sum of all quantities)
    const stockResult = await Product.aggregate([
        { $match: warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {} },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
    ]);
    const totalStock = stockResult[0]?.total || 0;

    const [tripMetricCount, verifiedTripsCount, billCount, lowStockCount, recentTripsRaw] = await Promise.all([
        Trip.countDocuments(tripQuery as any),
        Trip.countDocuments({ ...filter, status: "VERIFIED", ...(dateFilter ? { endTime: dateQuery } : {}) }),
        Bill.countDocuments(billQuery as any),
        Product.countDocuments({ ...filter, quantity: { $lt: 20 } }),
        Trip.find(activityQuery as any)
            .sort({ updatedAt: -1 })
            .limit(dateFilter ? 50 : 5)
            .populate("vehicleId")
            .lean()
    ]);

    const recentTrips = JSON.parse(JSON.stringify(recentTripsRaw));

    return {
        stockMetrics: {
            totalValue,
            totalBottles: totalBottlesRaw,
            totalPacks: totalPacksRaw,
            totalRemainder: totalRemainderBottles
        },
        tripMetricCount,
        verifiedTripsCount,
        billCount,
        lowStockCount,
        recentTrips,
        isFiltered: !!dateFilter,
        warehouseName
    };
}

import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/api/auth/signin");
    }

    const resolvedParams = await searchParams;
    const dateFilter = resolvedParams?.date || undefined; // Default to undefined to show Global

    const data = await getData(dateFilter);
    const user = session.user as any;

    return (
        <DashboardClient data={data} user={user} />
    );
}
