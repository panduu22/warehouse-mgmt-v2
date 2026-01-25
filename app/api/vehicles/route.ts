import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "STAFF")) {
        // Allow STAFF to add vehicles too? Prompt said "I cannt add the vehicle". 
        // Previous code had logic to allow. Let's allow authenticated users for now or allow STAFF.
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { number, driverName, warehouseId } = await req.json();

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                number,
                driverName,
                warehouseId,
                status: "AVAILABLE"
            }
        });

        return NextResponse.json(vehicle, { status: 201 });
    } catch (error) {
        console.error("Vehicle Creation Error:", error);
        return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    // If no warehouseId, maybe return empty or error? Or all?
    // In multi-tenant, we should strictly filter.
    if (!warehouseId) {
        return NextResponse.json([], { status: 400 });
    }

    try {
        const vehicles = await prisma.vehicle.findMany({
            where: { warehouseId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(vehicles);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
    }
}
