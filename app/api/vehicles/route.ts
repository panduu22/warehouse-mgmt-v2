import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "STAFF")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { number, driverName, warehouseId } = await req.json();

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        const db = await getDb();
        const newVehicle = {
            number,
            driverName,
            warehouseId: new ObjectId(warehouseId),
            status: "AVAILABLE",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("Vehicle").insertOne(newVehicle);

        return NextResponse.json({
            ...newVehicle,
            id: result.insertedId.toString(),
            _id: undefined
        }, { status: 201 });
    } catch (error) {
        console.error("Vehicle Creation Error:", error);
        return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) {
        return NextResponse.json([], { status: 400 });
    }

    try {
        const db = await getDb();
        const vehicles = await db.collection("Vehicle")
            .find({ warehouseId: new ObjectId(warehouseId) })
            .sort({ createdAt: -1 })
            .toArray();

        const formattedVehicles = vehicles.map(v => ({
            ...v,
            id: v._id.toString(),
            _id: undefined
        }));

        return NextResponse.json(formattedVehicles);
    } catch (error) {
        console.error("Failed to fetch vehicles", error);
        return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
    }
}
