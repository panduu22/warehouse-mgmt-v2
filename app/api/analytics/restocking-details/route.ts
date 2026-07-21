import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Restock from "@/models/Restock";
import Product from "@/models/Product";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/restocking-details
 * ?warehouseId=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=10&search=
 *
 * Uses IDENTICAL cost formula as /api/analytics/daily-restocking so that
 * the sum of all records' totalAmount == daily-restocking's totalRestockingPrice.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

        await dbConnect();

        const warehouseOid = new mongoose.Types.ObjectId(warehouseIdStr);
        const fromDate = new Date(`${from}T00:00:00+05:30`);
        const toDate   = new Date(`${to}T23:59:59.999+05:30`);

        // Fetch all confirmed restocks — same filter as daily-restocking
        const restocks = await Restock.find({
            warehouseId: warehouseOid,
            status: "CONFIRMED",
            createdAt: { $gte: fromDate, $lte: toDate },
        }).sort({ createdAt: -1 }).lean();

        if (restocks.length === 0) {
            return NextResponse.json({ records: [], total: 0, pagination: { page, limit, totalRecords: 0, totalPages: 0 } });
        }

        // Fetch products — same as daily-restocking
        const productIds = [
            ...new Set(restocks.flatMap((r) => r.items.map((i: any) => i.productId.toString()))),
        ].map((id) => new mongoose.Types.ObjectId(id));

        const products = await Product.find(
            { _id: { $in: productIds }, warehouseId: warehouseOid },
            { invoiceCost: 1, bottlesPerPack: 1, name: 1, pack: 1, flavour: 1 }
        ).lean();

        const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

        // Build records using IDENTICAL cost formula as daily-restocking
        const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(d);

        let grandTotal = 0;

        type DetailRecord = {
            date: string;
            invoiceNumber: string;
            enteredBy: string;
            totalProducts: number;
            totalAmount: number;
            items: { productName: string; packSize: string; quantity: number; invoiceCost: number; amount: number }[];
        };

        let records: DetailRecord[] = restocks.map((restock) => {
            let restockCost = 0;
            const items = (restock.items as any[]).map((item) => {
                const prod         = productMap.get(item.productId.toString());
                const invoiceCost  = prod?.invoiceCost   ?? 0;
                const bpp          = prod?.bottlesPerPack ?? item.bottlesPerPack ?? 1;
                const qty          = item.qtyAdded ?? 0;
                const packs        = Math.floor(qty / bpp);
                const bottles      = qty % bpp;
                const lineAmount   = packs * invoiceCost + bottles * (invoiceCost / bpp);
                restockCost += lineAmount;

                const productName = prod
                    ? [prod.name, prod.flavour, prod.pack].filter(Boolean).join(" ")
                    : item.flavour
                    ? `${item.flavour} ${item.pack || ""}`.trim()
                    : "Unknown Product";

                return {
                    productName,
                    packSize: item.pack || prod?.pack || "",
                    quantity: qty,
                    invoiceCost,
                    amount: lineAmount,
                };
            });

            grandTotal += restockCost;

            return {
                date: fmt(new Date(restock.createdAt)),
                invoiceNumber: restock.restockId,
                enteredBy: restock.userName || "Unknown",
                totalProducts: items.length,
                totalAmount: restockCost,
                items,
            };
        });

        // Server-side search filter
        if (search) {
            records = records.filter(
                (r) =>
                    r.invoiceNumber.toLowerCase().includes(search) ||
                    r.enteredBy.toLowerCase().includes(search)
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
        console.error("restocking-details API error:", error);
        return NextResponse.json({ error: "Failed to load restocking details" }, { status: 500 });
    }
}
