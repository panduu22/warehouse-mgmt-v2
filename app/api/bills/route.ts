import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";
export const dynamic = "force-dynamic";
import Trip from "@/models/Trip";
import Product from "@/models/Product";
import Vehicle from "@/models/Vehicle"; 
import mongoose from "mongoose";
import { parsePack } from "@/lib/stock-utils";
// Need Product to get price history? 
// Current Price or Historical Price? 
// Product model has current price. Trip doesn't store price snapshot.
// For accuracy, Trip should store priceAtLoad, but for MVP I'll use current Product price.
// Or fetch current price from Product model during calculation.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { tripId, date } = await req.json();
        
        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        await dbConnect();

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        // Check if bill exists
        const existingBill = await Bill.findOne({ tripId });
        if (existingBill) {
            return NextResponse.json({ error: "Bill already exists for this trip" }, { status: 400 });
        }

        const trip = await Trip.findById(tripId).populate("loadedItems.productId");
        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

        if (trip.status !== "VERIFIED") {
            return NextResponse.json({ error: "Trip must be verified before billing" }, { status: 400 });
        }

        // Calculate Total and Items Snapshot
        const items: any[] = [];
        let totalAmount = 0;

        trip.loadedItems.forEach((item: any) => {
            const bpp = parsePack(item.productId.pack, item.productId.name);
            const totalSoldBottles = item.qtyLoaded - (item.qtyReturned || 0);

            if (totalSoldBottles > 0) {
                const normalPrice = item.productId.price || item.productId.salePrice || 0;
                const bottlePrice = normalPrice / bpp;
                
                let lineSchemeBottles = 0;
                let lineSchemeTotal = 0;
                let lineDiscount = 0;
                const billItemSchemes: any[] = [];

                if (item.schemes && item.schemes.length > 0) {
                    item.schemes.forEach((s: any) => {
                        const sBottles = (s.packs * bpp) + s.bottles;
                        lineSchemeBottles += sBottles;
                        
                        const sPrice = normalPrice - s.discountPerPack;
                        const sBottlePrice = sPrice / bpp;
                        
                        const slabTotal = (s.packs * sPrice) + (s.bottles * sBottlePrice);
                        const slabDiscount = (sBottles / bpp) * s.discountPerPack;
                        
                        lineSchemeTotal += slabTotal;
                        lineDiscount += slabDiscount;
                        
                        billItemSchemes.push({
                            qty: sBottles,
                            price: sPrice,
                            discount: slabDiscount
                        });
                    });
                } else {
                    // Fallback for legacy items without schemes array
                    const legacySchemeBottles = item.qtyScheme || 0;
                    lineSchemeBottles = legacySchemeBottles;
                    const discountPerPack = item.discountPerPack || 0;
                    const sPrice = normalPrice - discountPerPack;
                    const sBottlePrice = sPrice / bpp;
                    
                    const sPacks = Math.floor(legacySchemeBottles / bpp);
                    const sBottles = legacySchemeBottles % bpp;
                    const slabTotal = (sPacks * sPrice) + (sBottles * sBottlePrice);
                    const slabDiscount = (legacySchemeBottles / bpp) * discountPerPack;
                    
                    lineSchemeTotal += slabTotal;
                    lineDiscount += slabDiscount;
                    
                    billItemSchemes.push({
                        qty: legacySchemeBottles,
                        price: sPrice,
                        discount: slabDiscount
                    });
                }

                const normalBottles = totalSoldBottles - lineSchemeBottles;
                const nPacks = Math.floor(normalBottles / bpp);
                const nBottles = normalBottles % bpp;
                const normalTotal = (nPacks * normalPrice) + (nBottles * bottlePrice);

                const lineTotal = normalTotal + lineSchemeTotal;

                totalAmount += lineTotal;
                items.push({
                    name: item.productId.name,
                    pack: item.productId.pack || "Standard",
                    flavour: item.productId.flavour || "Regular",
                    normalQty: normalBottles,
                    schemeQty: lineSchemeBottles,
                    normalPrice: normalPrice,
                    schemePrice: lineSchemeBottles > 0 ? (lineSchemeTotal / (lineSchemeBottles / bpp)) : normalPrice, // Average for legacy compatibility
                    discount: lineDiscount,
                    schemes: billItemSchemes,
                    total: lineTotal,
                    bottlesPerPack: bpp
                });
            }
        });

        const bill = await Bill.create({
            tripId,
            items,
            totalAmount,
            generatedBy: (session.user as any).id || (session.user as any)._id,
            generatedAt: date ? new Date(date) : new Date(),
            warehouseId
        });

        await logActivity({
            userId: (session.user as any).id || (session.user as any)._id,
            warehouseId: warehouseId.toString(),
            action: "GENERATE_BILL",
            details: `Generated invoice for trip ${trip.vehicleId.toString()} totaling ₹${totalAmount.toLocaleString()}.`,
            targetId: bill._id.toString(),
            targetModel: "Bill",
        });

        return NextResponse.json(bill, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to generate bill" }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        
        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
        }
        
        const filter = warehouseId ? { warehouseId } : {};

        const bills = await Bill.find(filter)
            .populate({
                path: "tripId",
                populate: [
                    { path: "vehicleId" },
                    { path: "loadedItems.productId" }
                ]
            })
            .populate("warehouseId")
            .sort({ generatedAt: -1 });
        return NextResponse.json(bills);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
    }
}
