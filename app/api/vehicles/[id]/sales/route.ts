import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import Vehicle from "@/models/Vehicle";

export const dynamic = "force-dynamic";

function toLocalDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const url = new URL(req.url);
        const timeframe = url.searchParams.get("timeframe") || "all"; // "weekly" | "monthly" | "all"

        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        // Build date filter using LOCAL (IST) calendar
        const now = new Date();
        const tripFilter: any = { vehicleId: id, status: "VERIFIED" };

        if (timeframe === "weekly") {
            // Monday of the current week (local time)
            const day = now.getDay();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
            weekStart.setHours(0, 0, 0, 0);
            tripFilter.$or = [
                { startTime: { $gte: weekStart } },
                { createdAt: { $gte: weekStart } },
            ];
        } else if (timeframe === "monthly") {
            // 1st of the current month (local time)
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            tripFilter.$or = [
                { startTime: { $gte: monthStart } },
                { createdAt: { $gte: monthStart } },
            ];
        }
        // "all" → no extra filter

        // Fetch trips
        const trips = await Trip.find(tripFilter)
            .populate("loadedItems.productId")
            .sort({ startTime: -1, createdAt: -1 });

        // Group by LOCAL calendar date (IST)
        const salesByDate: Record<string, any[]> = {};

        for (const trip of trips) {
            const dateObj = trip.startTime || trip.createdAt;
            if (!dateObj) continue;

            // Use local date key so date matches IST calendar day
            const dateStr = toLocalDateKey(new Date(dateObj));

            if (!salesByDate[dateStr]) {
                salesByDate[dateStr] = [];
            }

            for (const item of trip.loadedItems) {
                const product = (item as any).productId;
                if (!product) continue;

                const qtyLoaded = (item as any).qtyLoaded || 0;
                const qtyReturned = (item as any).qtyReturned || 0;
                const soldQty = qtyLoaded - qtyReturned;

                if (soldQty > 0) {
                    // Sales amount = Packs sold × Sale Price (price is per pack)
                    const bpp = product.bottlesPerPack || 1;
                    const soldPacks = Math.floor(soldQty / bpp);
                    const salesAmount = soldPacks * (product.salePrice || 0);

                    const existing = salesByDate[dateStr].find(
                        (p: any) => p.productId.toString() === product._id.toString()
                    );

                    if (existing) {
                        existing.soldQty += soldQty;
                        existing.salesAmount += salesAmount;
                    } else {
                        salesByDate[dateStr].push({
                            productId: product._id,
                            name: product.name,
                            flavour: product.flavour,
                            pack: product.pack,
                            bottlesPerPack: bpp,
                            salePrice: product.salePrice || 0,
                            invoiceCost: product.invoiceCost || 0,
                            soldQty,
                            salesAmount,
                        });
                    }
                }
            }
        }

        const result = Object.keys(salesByDate)
            .map((date) => ({ date, items: salesByDate[date] }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ vehicle, sales: result, timeframe });
    } catch (error) {
        console.error("Vehicle Sales API Error:", error);
        return NextResponse.json({ error: "Failed to fetch vehicle sales" }, { status: 500 });
    }
}
