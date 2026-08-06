import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import Vehicle from "@/models/Vehicle";
import Bill from "@/models/Bill";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";

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

        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        const vehicle = await Vehicle.findOne({ _id: id, warehouseId });
        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found in active warehouse" }, { status: 404 });
        }

        // Build date filter using LOCAL (IST) calendar
        const tripFilter: any = { vehicleId: id, status: "VERIFIED", warehouseId };

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
        // Determine if we should consolidate (a multi-day date range is active)
        const isConsolidated = !!(fromDate && toDate && fromDate !== toDate);

        // Fetch trips
        const trips = await Trip.find(tripFilter)
            .populate("loadedItems.productId")
            .sort({ startTime: -1, createdAt: -1 });

        if (isConsolidated) {
            const financialSummary = {
                totalGrossSales: 0,
                totalNetSales: 0,
                totalDiscounts: 0,
                totalExpenses: 0,
                totalUPI: 0,
                totalCash: 0,
                totalReceived: 0,
                totalOutstanding: 0,
                totalBills: 0,
                totalProductsSold: 0,
                activeDays: 0,
            };

            const uniqueDates = new Set<string>();
            const consolidatedItemsMap: Record<string, any> = {};
            const tripIds = trips.map(t => t._id);

            // Calculate Bills
            financialSummary.totalBills = await Bill.countDocuments({ tripId: { $in: tripIds } });

            for (const trip of trips) {
                const dateObj = trip.startTime || trip.createdAt;
                if (dateObj) uniqueDates.add(toLocalDateKey(new Date(dateObj)));

                financialSummary.totalExpenses += (trip.expensesAmount || 0);
                financialSummary.totalUPI += (trip.upiAmount || 0);
                financialSummary.totalCash += (trip.cashAmount || 0);
                financialSummary.totalReceived += (trip.receivedTotal || 0);
                financialSummary.totalOutstanding += (trip.balanceAmount || 0);

                for (const item of trip.loadedItems) {
                    const product = (item as any).productId;
                    if (!product) continue;

                    const qtyLoaded = (item as any).qtyLoaded || 0;
                    const qtyReturned = (item as any).qtyReturned || 0;
                    const soldQty = qtyLoaded - qtyReturned;

                    if (soldQty > 0) {
                        const bpp = product.bottlesPerPack || 1;
                        const packPrice = product.salePrice || product.price || 0;
                        const bottlePrice = packPrice / bpp;

                        let lineSchemeBottles = 0;
                        let lineSchemeTotal = 0;
                        let lineDiscount = 0;

                        if ((item as any).schemes && Array.isArray((item as any).schemes) && (item as any).schemes.length > 0) {
                            for (const scheme of (item as any).schemes) {
                                const sBottles = ((scheme.packs || 0) * bpp) + (scheme.bottles || 0);
                                lineSchemeBottles += sBottles;
                                const discountPerPack = scheme.discountPerPack || 0;
                                const sPrice = packPrice - discountPerPack;
                                const sBottlePrice = sPrice / bpp;
                                const slabTotal = ((scheme.packs || 0) * sPrice) + ((scheme.bottles || 0) * sBottlePrice);
                                const slabDiscount = (sBottles / bpp) * discountPerPack;
                                lineSchemeTotal += slabTotal;
                                lineDiscount += slabDiscount;
                            }
                        } else if ((item as any).qtyScheme && (item as any).qtyScheme > 0) {
                            const sBottles = (item as any).qtyScheme;
                            lineSchemeBottles += sBottles;
                            const discountPerPack = (item as any).discountPerPack || 0;
                            const sPrice = packPrice - discountPerPack;
                            const sBottlePrice = sPrice / bpp;
                            const sPacks = Math.floor(sBottles / bpp);
                            const sRem = sBottles % bpp;
                            lineSchemeTotal += (sPacks * sPrice) + (sRem * sBottlePrice);
                            lineDiscount += (sBottles / bpp) * discountPerPack;
                        }

                        const normalBottles = soldQty - lineSchemeBottles;
                        const nPacks = Math.floor(normalBottles / bpp);
                        const nRem = normalBottles % bpp;
                        const normalTotal = (nPacks * packPrice) + (nRem * bottlePrice);

                        const lineNetTotal = normalTotal + lineSchemeTotal;
                        const lineGrossValue = lineNetTotal + lineDiscount;

                        financialSummary.totalGrossSales += lineGrossValue;
                        financialSummary.totalDiscounts += lineDiscount;
                        financialSummary.totalProductsSold += soldQty;

                        const pId = product._id.toString();
                        if (consolidatedItemsMap[pId]) {
                            consolidatedItemsMap[pId].soldQty += soldQty;
                            consolidatedItemsMap[pId].normalQty += normalBottles;
                            consolidatedItemsMap[pId].schemeQty += lineSchemeBottles;
                            consolidatedItemsMap[pId].salesAmount += lineGrossValue;
                            consolidatedItemsMap[pId].normalSalesAmount += normalTotal;
                            consolidatedItemsMap[pId].schemeDiscountAmount += lineDiscount;
                            consolidatedItemsMap[pId].netSalesAmount += lineNetTotal;
                        } else {
                            consolidatedItemsMap[pId] = {
                                productId: pId,
                                name: product.name,
                                flavour: product.flavour,
                                pack: product.pack,
                                bottlesPerPack: bpp,
                                salePrice: packPrice,
                                soldQty,
                                normalQty: normalBottles,
                                schemeQty: lineSchemeBottles,
                                salesAmount: lineGrossValue,
                                normalSalesAmount: normalTotal,
                                schemeDiscountAmount: lineDiscount,
                                netSalesAmount: lineNetTotal,
                            };
                        }
                    }
                }
            }

            financialSummary.totalNetSales = financialSummary.totalGrossSales - financialSummary.totalDiscounts;
            financialSummary.activeDays = uniqueDates.size;

            const consolidatedItems = Object.values(consolidatedItemsMap).sort((a, b) => b.salesAmount - a.salesAmount);

            return NextResponse.json({ 
                vehicle, 
                isConsolidated: true, 
                financialSummary, 
                sales: [{ date: "Consolidated Period", items: consolidatedItems }],
                fromDate, 
                toDate 
            });
        }

        // --- Day-wise Grouping logic (Unfiltered or Single Day) ---
        const salesByDate: Record<string, any[]> = {};

        for (const trip of trips) {
            const dateObj = trip.startTime || trip.createdAt;
            if (!dateObj) continue;

            const dateStr = toLocalDateKey(new Date(dateObj));

            if (!salesByDate[dateStr]) salesByDate[dateStr] = [];

            for (const item of trip.loadedItems) {
                const product = (item as any).productId;
                if (!product) continue;

                const qtyLoaded = (item as any).qtyLoaded || 0;
                const qtyReturned = (item as any).qtyReturned || 0;
                const soldQty = qtyLoaded - qtyReturned;

                if (soldQty > 0) {
                    const bpp = product.bottlesPerPack || 1;
                    const packPrice = product.salePrice || product.price || 0;
                    const bottlePrice = packPrice / bpp;

                    let lineSchemeBottles = 0;
                    let lineSchemeTotal = 0;
                    let lineDiscount = 0;

                    if ((item as any).schemes && Array.isArray((item as any).schemes) && (item as any).schemes.length > 0) {
                        for (const scheme of (item as any).schemes) {
                            const sBottles = ((scheme.packs || 0) * bpp) + (scheme.bottles || 0);
                            lineSchemeBottles += sBottles;
                            const discountPerPack = scheme.discountPerPack || 0;
                            const sPrice = packPrice - discountPerPack;
                            const sBottlePrice = sPrice / bpp;
                            const slabTotal = ((scheme.packs || 0) * sPrice) + ((scheme.bottles || 0) * sBottlePrice);
                            const slabDiscount = (sBottles / bpp) * discountPerPack;
                            lineSchemeTotal += slabTotal;
                            lineDiscount += slabDiscount;
                        }
                    } else if ((item as any).qtyScheme && (item as any).qtyScheme > 0) {
                        const sBottles = (item as any).qtyScheme;
                        lineSchemeBottles += sBottles;
                        const discountPerPack = (item as any).discountPerPack || 0;
                        const sPrice = packPrice - discountPerPack;
                        const sBottlePrice = sPrice / bpp;
                        const sPacks = Math.floor(sBottles / bpp);
                        const sRem = sBottles % bpp;
                        lineSchemeTotal += (sPacks * sPrice) + (sRem * sBottlePrice);
                        lineDiscount += (sBottles / bpp) * discountPerPack;
                    }

                    const normalBottles = soldQty - lineSchemeBottles;
                    const nPacks = Math.floor(normalBottles / bpp);
                    const nRem = normalBottles % bpp;
                    const normalTotal = (nPacks * packPrice) + (nRem * bottlePrice);

                    const lineNetTotal = normalTotal + lineSchemeTotal;
                    const lineGrossValue = lineNetTotal + lineDiscount;

                    const existing = salesByDate[dateStr].find(
                        (p: any) => p.productId.toString() === product._id.toString()
                    );

                    if (existing) {
                        existing.soldQty += soldQty;
                        existing.normalQty += normalBottles;
                        existing.schemeQty += lineSchemeBottles;
                        existing.salesAmount += lineGrossValue;
                        existing.normalSalesAmount += normalTotal;
                        existing.schemeDiscountAmount += lineDiscount;
                        existing.netSalesAmount += lineNetTotal;
                    } else {
                        salesByDate[dateStr].push({
                            productId: product._id,
                            name: product.name,
                            flavour: product.flavour,
                            pack: product.pack,
                            bottlesPerPack: bpp,
                            salePrice: packPrice,
                            soldQty,
                            normalQty: normalBottles,
                            schemeQty: lineSchemeBottles,
                            salesAmount: lineGrossValue,
                            normalSalesAmount: normalTotal,
                            schemeDiscountAmount: lineDiscount,
                            netSalesAmount: lineNetTotal,
                        });
                    }
                }
            }
        }

        const result = Object.keys(salesByDate)
            .map((date) => ({ date, items: salesByDate[date] }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ vehicle, isConsolidated: false, sales: result, fromDate, toDate });
    } catch (error) {
        console.error("Vehicle Sales API Error:", error);
        return NextResponse.json({ error: "Failed to fetch vehicle sales" }, { status: 500 });
    }
}
