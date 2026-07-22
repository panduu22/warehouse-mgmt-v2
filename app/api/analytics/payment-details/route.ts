import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DailyPayment from "@/models/DailyPayment";
import mongoose from "mongoose";
import { requireWarehouseAccess, guardWarehouseParam } from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/payment-details
 * ?warehouseId=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=10&search=
 *
 * Returns paginated DailyPayment entries. Grand total matches /api/analytics/daily-payment.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
        if (denied) return denied;

        const url = new URL(req.url);
        const warehouseIdStr = url.searchParams.get("warehouseId");
        const from           = url.searchParams.get("from");
        const to             = url.searchParams.get("to");
        const page           = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit          = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
        const search         = (url.searchParams.get("search") || "").toLowerCase().trim();

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

        // Same filter logic as /api/analytics/daily-payment (date field is IST string "YYYY-MM-DD")
        const payments = await DailyPayment.find({
            warehouseId: warehouseOid,
            date: { $gte: from, $lte: to },
        }).sort({ date: -1, createdAt: -1 }).lean();

        let grandTotal = 0;

        type PaymentRecord = { date: string; enteredBy: string; remarks: string; amount: number };

        let records: PaymentRecord[] = payments.map((p) => {
            grandTotal += p.amount ?? 0;
            return {
                date:      p.date,
                enteredBy: p.userName || "Unknown",
                remarks:   p.note   || "",
                amount:    p.amount ?? 0,
            };
        });

        // Server-side search
        if (search) {
            records = records.filter(
                (r) =>
                    r.enteredBy.toLowerCase().includes(search) ||
                    r.remarks.toLowerCase().includes(search)
            );
        }

        const totalRecords = records.length;
        const totalPages   = Math.ceil(totalRecords / limit);
        const paginated    = records.slice((page - 1) * limit, page * limit);

        return NextResponse.json({
            records: paginated,
            total: grandTotal,
            pagination: { page, limit, totalRecords, totalPages },
        });
    } catch (error) {
        console.error("payment-details API error:", error);
        return NextResponse.json({ error: "Failed to load payment details" }, { status: 500 });
    }
}
