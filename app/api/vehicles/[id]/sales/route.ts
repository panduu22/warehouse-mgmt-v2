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

/** Parse a YYYY-MM-DD string as a LOCAL (IST) date — not UTC. */
function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const url = new URL(req.url);
        // Date range params: YYYY-MM-DD strings (IST calendar)
        const fromDate = url.searchParams.get("fromDate");
        const toDate = url.searchParams.get("toDate");

        const vehicle = await Vehicle.findById(id);
        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        // Build date filter using LOCAL (IST) calendar
        const tripFilter: any = { vehicleId: id, status: "VERIFIED" };

        if (fromDate || toDate) {
            const dateCondition: any = {};

            if (fromDate) {
                // Start of fromDate day in LOCAL time (inclusive)
                const from = parseLocalDate(fromDate);
                from.setHours(0, 0, 0, 0);
                dateCondition.$gte = from;
            }

            if (toDate) {
                // End of toDate day in LOCAL time (inclusive)
                const to = parseLocalDate(toDate);
                to.setHours(23, 59, 59, 999);
                dateCondition.$lte = to;
            }

            tripFilter.$or = [
                { startTime: dateCondition },
                { createdAt: dateCondition },
            ];
        }
        // No date params → no extra filter (show all records)

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

        return NextResponse.json({ vehicle, sales: result, fromDate, toDate });
    } catch (error) {
        console.error("Vehicle Sales API Error:", error);
        return NextResponse.json({ error: "Failed to fetch vehicle sales" }, { status: 500 });
    }
}
