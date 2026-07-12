import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Restock from "@/models/Restock";
import Product from "@/models/Product";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/daily-restocking?warehouseId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { totalRestockingPrice: number, breakdown: { date: string, amount: number }[] }
 *
 * Sums invoice cost for all confirmed restocks in the given warehouse + IST date range.
 * Loose bottles are costed proportionally: invoiceCost / bottlesPerPack × bottles.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

        await dbConnect();

        const warehouseOid = new mongoose.Types.ObjectId(warehouseIdStr);

        // IST date range (full day inclusive)
        const fromDate = new Date(`${from}T00:00:00+05:30`);
        const toDate   = new Date(`${to}T23:59:59.999+05:30`);

        // Fetch all confirmed restocks in this warehouse + date range
        const restocks = await Restock.find({
            warehouseId: warehouseOid,
            status: "CONFIRMED",
            createdAt: { $gte: fromDate, $lte: toDate },
        }).lean();

        if (restocks.length === 0) {
            return NextResponse.json({ totalRestockingPrice: 0, breakdown: [] });
        }

        // Collect unique productIds
        const productIds = [
            ...new Set(
                restocks.flatMap((r) => r.items.map((i: any) => i.productId.toString()))
            ),
        ].map((id) => new mongoose.Types.ObjectId(id));

        // Fetch products (only need invoiceCost + bottlesPerPack)
        const products = await Product.find(
            { _id: { $in: productIds }, warehouseId: warehouseOid },
            { invoiceCost: 1, bottlesPerPack: 1 }
        ).lean();

        const productMap = new Map(
            products.map((p: any) => [p._id.toString(), p])
        );

        // Calculate total and breakdown
        let totalRestockingPrice = 0;
        const breakdownMap = new Map<string, number>();

        for (const restock of restocks) {
            const dateObj = new Date(restock.createdAt);
            // Format to IST YYYY-MM-DD
            const istDateStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(dateObj);

            let restockCost = 0;
            for (const item of restock.items as any[]) {
                const prod = productMap.get(item.productId.toString());
                const invoiceCost   = prod?.invoiceCost   ?? 0;
                const bottlesPerPack = prod?.bottlesPerPack ?? item.bottlesPerPack ?? 1;
                const qty           = item.qtyAdded ?? 0;
                const packs         = Math.floor(qty / bottlesPerPack);
                const bottles       = qty % bottlesPerPack;
                restockCost +=
                    packs * invoiceCost +
                    bottles * (invoiceCost / bottlesPerPack);
            }

            totalRestockingPrice += restockCost;
            breakdownMap.set(istDateStr, (breakdownMap.get(istDateStr) || 0) + restockCost);
        }

        const breakdown = Array.from(breakdownMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ totalRestockingPrice, breakdown });
    } catch (error) {
        console.error("daily-restocking API error:", error);
        return NextResponse.json({ error: "Failed to calculate restocking price" }, { status: 500 });
    }
}
