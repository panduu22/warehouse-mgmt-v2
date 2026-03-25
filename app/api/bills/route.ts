import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";
export const dynamic = "force-dynamic";
import Trip from "@/models/Trip";
import Product from "@/models/Product";
import Vehicle from "@/models/Vehicle"; // Ensure model is registered for populate
import mongoose from "mongoose";
// Need Product to get price history? 
// Current Price or Historical Price? 
// Product model has current price. Trip doesn't store price snapshot.
// For accuracy, Trip should store priceAtLoad, but for MVP I'll use current Product price.
// Or fetch current price from Product model during calculation.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = [];
        let totalAmount = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trip.loadedItems.forEach((item: any) => {
            const sold = item.qtyLoaded - (item.qtyReturned || 0);
            const price = item.productId.price || item.productId.salePrice || 0;
            if (sold > 0) {
                const lineTotal = sold * price;
                totalAmount += lineTotal;
                items.push({
                    name: item.productId.name,
                    pack: item.productId.pack || "Standard",
                    flavour: item.productId.flavour || "Regular",
                    quantity: sold,
                    price: price,
                    total: lineTotal
                });
            }
        });

        const bill = await Bill.create({
            tripId,
            items,
            totalAmount,
            generatedBy: (session.user as any).id,
            generatedAt: date ? new Date(date) : new Date(),
            warehouseId
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
