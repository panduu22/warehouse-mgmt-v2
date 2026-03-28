import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
export const dynamic = "force-dynamic";
import Product from "@/models/Product";
import Vehicle from "@/models/Vehicle";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { vehicleId, items } = await req.json();

        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        await dbConnect();

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        if (!vehicleId || !items || items.length === 0) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        await dbConnect();

        // Verify loading possibility and deduct stock
        // Using transaction would be better but replica set required. 
        // I'll stick to manual checks/updates for MVP.

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 });
            }
            if (product.quantity < item.qtyLoaded) {
                return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
            }
        }

        // Deduct stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: -item.qtyLoaded }
            });
        }

        // Update Vehicle status
        await Vehicle.findByIdAndUpdate(vehicleId, { status: "IN_TRANSIT" });

        const trip = await Trip.create({
            vehicleId,
            loadedItems: items,
            status: "LOADED",
            warehouseId
        });

        await logActivity({
            userId: (session.user as any).id || (session.user as any)._id,
            warehouseId: warehouseId.toString(),
            action: "LOAD_VEHICLE",
            details: `Loaded ${items.length} product(s) onto vehicle.`,
            targetId: trip._id.toString(),
            targetModel: "Trip",
        });

        return NextResponse.json(trip, { status: 201 });
    } catch (error) {
        console.error("Trip create error:", error);
        return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
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

        const trips = await Trip.find(filter)
            .populate("vehicleId")
            .populate("loadedItems.productId") // Populate product details in items
            .sort({ createdAt: -1 });
        return NextResponse.json(trips);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
    }
}
