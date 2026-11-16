import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RestockHistory from "@/models/RestockHistory";
import mongoose from "mongoose";
import { requireWarehouseAccess, guardWarehouseParam } from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

/**
 * GET /api/restock-history
 * Query params:
 *   - warehouseId: string (or "ALL")
 *   - from: YYYY-MM-DD
 *   - to: YYYY-MM-DD
 *   - search: string
 *   - page: number (default 1)
 *   - limit: number (default 10, max 10000 for export)
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
        if (denied) return denied;

        const url = new URL(req.url);
        const requestedWarehouseId = url.searchParams.get("warehouseId");
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const search = (url.searchParams.get("search") || "").trim();
        const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
        const limitParam = parseInt(url.searchParams.get("limit") || "10", 10);

        const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
        const limit = Math.min(10000, Math.max(1, isNaN(limitParam) ? 10 : limitParam));

        await dbConnect();

        // ── 1. Warehouse Access Filter ──────────────────────────────────────
        const query: any = {};

        if (requestedWarehouseId && requestedWarehouseId !== "ALL") {
            if (!mongoose.Types.ObjectId.isValid(requestedWarehouseId)) {
                return NextResponse.json({ error: "Invalid warehouseId" }, { status: 400 });
            }
            const guard = guardWarehouseParam(requestedWarehouseId, isSuperAdmin, assignedWarehouseIds);
            if (guard) return guard;
            query.warehouseId = new mongoose.Types.ObjectId(requestedWarehouseId);
        } else {
            // "ALL" or omitted
            if (!isSuperAdmin) {
                const assignedOids = assignedWarehouseIds
                    .filter((id) => mongoose.Types.ObjectId.isValid(id))
                    .map((id) => new mongoose.Types.ObjectId(id));
                query.warehouseId = { $in: assignedOids };
            }
        }

        // ── 2. Date Range Filter ───────────────────────────────────────────
        if (from && to) {
            query.restockDate = { $gte: from, $lte: to };
        } else if (from) {
            query.restockDate = { $gte: from };
        } else if (to) {
            query.restockDate = { $lte: to };
        }

        // ── 3. Search Filter (product, flavour, pack, warehouse, user, ID) ──
        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            query.$or = [
                { transactionId: regex },
                { warehouseName: regex },
                { "createdBy.userName": regex },
                { "products.productNameSnapshot": regex },
                { "products.flavourSnapshot": regex },
                { "products.packSizeSnapshot": regex },
            ];
        }

        // ── 4. Aggregate Summary Totals for filtered results ───────────────
        const summaryAgg = await RestockHistory.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalCases: { $sum: "$totalCases" },
                    totalBottles: { $sum: "$totalBottles" },
                    grandTotal: { $sum: "$grandTotal" },
                    totalProductsRestocked: { $sum: "$totalProducts" },
                },
            },
        ]);

        const summary = summaryAgg[0] || {
            totalTransactions: 0,
            totalCases: 0,
            totalBottles: 0,
            grandTotal: 0,
            totalProductsRestocked: 0,
        };

        summary.grandTotal = Math.round(summary.grandTotal * 100) / 100;

        // ── 5. Fetch Paginated Records ─────────────────────────────────────
        const totalRecords = summary.totalTransactions;
        const totalPages = Math.ceil(totalRecords / limit);
        const skip = (page - 1) * limit;

        const transactions = await RestockHistory.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return NextResponse.json({
            transactions,
            pagination: {
                page,
                limit,
                totalRecords,
                totalPages,
            },
            summary,
        });
    } catch (error: any) {
        console.error("GET /api/restock-history error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch restock history" }, { status: 500 });
    }
}

