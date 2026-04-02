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
                const schemeBottles = item.qtyScheme || 0;
                const normalBottles = totalSoldBottles - schemeBottles;

                const normalPrice = item.productId.price || item.productId.salePrice || 0;
                const bottlePrice = normalPrice / bpp;
                const discountPerPack = item.discountPerPack || 0;
                const schemePrice = normalPrice - discountPerPack;
                const schemeBottlePrice = schemePrice / bpp;

                // Split normal bottles into packs/bottles for precise pricing
                const nPacks = Math.floor(normalBottles / bpp);
                const nBottles = normalBottles % bpp;
                const normalTotal = (nPacks * normalPrice) + (nBottles * bottlePrice);

                // Split scheme bottles into packs/bottles
                const sPacks = Math.floor(schemeBottles / bpp);
                const sBottles = schemeBottles % bpp;
                const schemeTotal = (sPacks * schemePrice) + (sBottles * schemeBottlePrice);
                
                const lineTotal = normalTotal + schemeTotal;
                const lineDiscount = (schemeBottles / bpp) * discountPerPack;

                totalAmount += lineTotal;
                items.push({
                    name: item.productId.name,
                    pack: item.productId.pack || "Standard",
                    flavour: item.productId.flavour || "Regular",
                    normalQty: normalBottles,
                    schemeQty: schemeBottles,
                    normalPrice: normalPrice,
                    schemePrice: schemePrice,
                    discount: lineDiscount,
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
