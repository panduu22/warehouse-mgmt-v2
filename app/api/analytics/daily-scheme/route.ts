import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import mongoose from "mongoose";
import { requireWarehouseAccess, guardWarehouseParam } from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/daily-scheme?warehouseId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { totalSchemeValue: number, breakdown: { date: string, amount: number }[] }
 *
 * Reuses the existing scheme discount formula from the vehicle trip/billing system:
 *   For each scheme slab → discountPerPack × packs
 * Sums across ALL trips belonging to the given warehouse in the IST date range.
 * No new formula is introduced.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
        if (denied) return denied;

        const url = new URL(req.url);
        const warehouseIdStr = url.searchParams.get("warehouseId");
        const from = url.searchParams.get("from");
        const to   = url.searchParams.get("to");

        if (!warehouseIdStr || !from || !to) {
            return NextResponse.json({ error: "Missing required params: warehouseId, from, to" }, { status: 400 });
        }
        if (!mongoose.Types.ObjectId.isValid(warehouseIdStr)) {
            return NextResponse.json({ error: "Invalid warehouseId" }, { status: 400 });
        }

        const guard = guardWarehouseParam(warehouseIdStr, isSuperAdmin, assignedWarehouseIds);
        if (guard) return guard;

        await dbConnect();

        const warehouseOid = new mongoose.Types.ObjectId(warehouseIdStr);

        // IST date range (full day inclusive)
        const fromDate = new Date(`${from}T00:00:00+05:30`);
        const toDate   = new Date(`${to}T23:59:59.999+05:30`);

        // Fetch all trips for this warehouse in the date range
        const trips = await Trip.find({
            warehouseId: warehouseOid,
            createdAt: { $gte: fromDate, $lte: toDate },
        }).lean();

        let totalSchemeValue = 0;
        const breakdownMap = new Map<string, number>();

        for (const trip of trips) {
            const dateObj = new Date(trip.createdAt);
            const istDateStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(dateObj);

            let tripSchemeValue = 0;

            for (const item of (trip.loadedItems ?? []) as any[]) {
                const schemes: any[] = item.schemes ?? [];
                if (schemes.length > 0) {
                    for (const slab of schemes) {
                        tripSchemeValue +=
                            (slab.discountPerPack ?? 0) * (slab.packs ?? 0);
                    }
                } else if (item.discountPerPack && item.discountPerPack > 0) {
                    const bpp = item.bottlesPerPack ?? 1;
                    const schemePacks = Math.floor((item.qtyScheme ?? 0) / bpp);
                    tripSchemeValue += (item.discountPerPack ?? 0) * schemePacks;
                }
            }

            totalSchemeValue += tripSchemeValue;
            breakdownMap.set(istDateStr, (breakdownMap.get(istDateStr) || 0) + tripSchemeValue);
        }

        const breakdown = Array.from(breakdownMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ totalSchemeValue, breakdown });
    } catch (error) {
        console.error("daily-scheme API error:", error);
        return NextResponse.json({ error: "Failed to calculate scheme value" }, { status: 500 });
    }
}
