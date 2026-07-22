import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DailyPayment from "@/models/DailyPayment";
import mongoose from "mongoose";
import Warehouse from "@/models/Warehouse";
import { requireWarehouseAccess, guardWarehouseParam } from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/daily-payment?warehouseId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { totalAmountPaid: number, breakdown: { date: string, amount: number }[] }
 *
 * Sums all manually entered paid amounts for the given warehouse and date range.
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

        const breakdownResult = await DailyPayment.aggregate([
            {
                $match: {
                    warehouseId: warehouseOid,
                    date: { $gte: from, $lte: to }
                }
            },
            {
                $group: {
                    _id: "$date",
                    amount: { $sum: "$amount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        let totalAmountPaid = 0;
        const breakdown = breakdownResult.map(item => {
            totalAmountPaid += item.amount;
            return { date: item._id, amount: item.amount };
        });

        return NextResponse.json({ totalAmountPaid, breakdown });
    } catch (error) {
        console.error("daily-payment GET error:", error);
        return NextResponse.json({ error: "Failed to fetch total amount paid" }, { status: 500 });
    }
}

/**
 * POST /api/analytics/daily-payment
 * Body: { warehouseId, date, amount }
 *
 * Adds a new daily payment entry.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
        if (denied) return denied;

        const body = await req.json();
        const { warehouseId, date, amount } = body;

        if (!warehouseId || !date || amount === undefined || amount === null) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (amount < 0) {
            return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
        }

        const guard = guardWarehouseParam(warehouseId, isSuperAdmin, assignedWarehouseIds);
        if (guard) return guard;

        await dbConnect();

        const user = session.user as any;
        const userIdRaw = user.id || user._id;
        let userOid: mongoose.Types.ObjectId;
        try {
            userOid = new mongoose.Types.ObjectId(userIdRaw);
        } catch {
            userOid = new mongoose.Types.ObjectId();
        }

        const newPayment = await DailyPayment.create({
            warehouseId: new mongoose.Types.ObjectId(warehouseId),
            date,
            amount: Number(amount),
            userId: userOid,
            userName: user.name || user.email || "Unknown User",
        });

        return NextResponse.json(newPayment, { status: 201 });
    } catch (error) {
        console.error("daily-payment POST error:", error);
        return NextResponse.json({ error: "Failed to save payment" }, { status: 500 });
    }
}
