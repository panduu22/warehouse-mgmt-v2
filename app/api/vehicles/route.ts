import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { number, driverName } = await req.json();
        await dbConnect();
        
        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        const vehicle = await Vehicle.create({
            number,
            driverName,
            warehouseId
        });

        return NextResponse.json(vehicle, { status: 201 });
    } catch (error: any) {
        console.error("Vehicle Creation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create vehicle" }, { status: 500 });
    }
}

export async function GET() {
    await dbConnect();
    try {
        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
        }
        
        const filter = warehouseId ? { warehouseId } : {};
        const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
        return NextResponse.json(vehicles);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
    }
}
