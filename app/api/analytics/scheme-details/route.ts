import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import Vehicle from "@/models/Vehicle";
import Product from "@/models/Product";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/scheme-details
 * ?warehouseId=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=10&search=
 *
 * Uses IDENTICAL scheme formula as /api/analytics/daily-scheme so that
 * sum of all records' totalSchemeValue == daily-scheme's totalSchemeValue.
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

        // Same filter as daily-scheme
        const trips = await Trip.find({
            warehouseId: warehouseOid,
            createdAt: { $gte: fromDate, $lte: toDate },
        }).sort({ createdAt: -1 }).lean();

        if (trips.length === 0) {
            return NextResponse.json({ records: [], total: 0, pagination: { page, limit, totalRecords: 0, totalPages: 0 } });
        }

        // Fetch vehicles
        const vehicleIds = [...new Set(trips.map((t) => t.vehicleId?.toString()))].filter(Boolean);
        const vehicles = await Vehicle.find({
            _id: { $in: vehicleIds.map((id) => new mongoose.Types.ObjectId(id!)) },
        }, { number: 1, driverName: 1 }).lean();
        const vehicleMap = new Map(vehicles.map((v: any) => [v._id.toString(), v]));

        // Fetch products for name lookup
        const productIds = [
            ...new Set(trips.flatMap((t) => (t.loadedItems ?? []).map((i: any) => i.productId?.toString()).filter(Boolean))),
        ].map((id) => new mongoose.Types.ObjectId(id as string));

        const products = await Product.find(
            { _id: { $in: productIds } },
            { name: 1, pack: 1, flavour: 1 }
        ).lean();
        const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

        const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(d);

        let grandTotal = 0;

        type SchemeItem = { productName: string; schemeType: string; packs: number; discountPerPack: number; amount: number };
        type DetailRecord = {
            date: string; vehicleNumber: string; driverName: string;
            totalSchemeValue: number; items: SchemeItem[];
        };

        let records: DetailRecord[] = trips.map((trip) => {
            const vehicle    = vehicleMap.get(trip.vehicleId?.toString() || "");
            let tripScheme   = 0;
            const items: SchemeItem[] = [];

            for (const item of (trip.loadedItems ?? []) as any[]) {
                const prod = productMap.get(item.productId?.toString() || "");
                const productName = prod
                    ? [prod.name, prod.flavour, prod.pack].filter(Boolean).join(" ")
                    : "Unknown Product";

                const schemes: any[] = item.schemes ?? [];
                if (schemes.length > 0) {
                    for (const slab of schemes) {
                        const slabAmount = (slab.discountPerPack ?? 0) * (slab.packs ?? 0);
                        tripScheme += slabAmount;
                        if (slabAmount > 0) {
                            items.push({
                                productName,
                                schemeType: slab.freeItems?.length > 0 ? "Free Items" : "Discount",
                                packs: slab.packs ?? 0,
                                discountPerPack: slab.discountPerPack ?? 0,
                                amount: slabAmount,
                            });
                        }
                    }
                } else if (item.discountPerPack && item.discountPerPack > 0) {
                    const bpp        = item.bottlesPerPack ?? 1;
                    const schemePacks = Math.floor((item.qtyScheme ?? 0) / bpp);
                    const slabAmount  = (item.discountPerPack ?? 0) * schemePacks;
                    tripScheme += slabAmount;
                    if (slabAmount > 0) {
                        items.push({
                            productName,
                            schemeType: "Discount",
                            packs: schemePacks,
                            discountPerPack: item.discountPerPack,
                            amount: slabAmount,
                        });
                    }
                }
            }

            grandTotal += tripScheme;

            return {
                date: fmt(new Date(trip.createdAt)),
                vehicleNumber: (vehicle as any)?.number || "Unknown",
                driverName:    (vehicle as any)?.driverName || "Unknown",
                totalSchemeValue: tripScheme,
                items,
            };
        }).filter((r) => r.totalSchemeValue > 0); // only show trips with scheme value

        // Server-side search
        if (search) {
            records = records.filter(
                (r) =>
                    r.vehicleNumber.toLowerCase().includes(search) ||
                    r.driverName.toLowerCase().includes(search)
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
        console.error("scheme-details API error:", error);
        return NextResponse.json({ error: "Failed to load scheme details" }, { status: 500 });
    }
}
