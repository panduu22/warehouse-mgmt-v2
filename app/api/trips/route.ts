import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { vehicleId, items, warehouseId } = await req.json();

        if (!vehicleId || !items || items.length === 0 || !warehouseId) {
            return NextResponse.json({ error: "Invalid data: Missing vehicle, items, or warehouse" }, { status: 400 });
        }

        // Use interactive transaction
        const trip = await prisma.$transaction(async (tx) => {

            // 1. Validate Vehicle & Availability
            const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
            if (!vehicle) throw new Error("Vehicle not found");
            if (vehicle.status !== "AVAILABLE") throw new Error("Vehicle is not available");
            if (vehicle.warehouseId !== warehouseId) throw new Error("Vehicle belongs to different warehouse");

            // 2. Validate Products & Stock deduction
            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });

                if (!product) throw new Error(`Product not found: ${item.productId}`);
                if (product.warehouseId !== warehouseId) throw new Error(`Product ${product.name} incorrect warehouse`);
                if (product.quantity < item.qtyLoaded) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.qtyLoaded}`);
                }

                // Deduct stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: item.qtyLoaded } }
                });
            }

            // 3. Update Vehicle Status
            await tx.vehicle.update({
                where: { id: vehicleId },
                data: { status: "IN_TRANSIT" }
            });

            // 4. Create Trip
            const newTrip = await tx.trip.create({
                data: {
                    warehouseId,
                    vehicleId,
                    status: "LOADED",
                    loadedItems: items.map((i: any) => ({
                        productId: i.productId,
                        qtyLoaded: i.qtyLoaded,
                        qtyReturned: 0
                    }))
                }
            });

            return newTrip;
        });

        return NextResponse.json(trip, { status: 201 });
    } catch (error: any) {
        console.error("Trip creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to create trip" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) {
        return NextResponse.json([], { status: 400 });
    }

    try {
        const trips = await prisma.trip.findMany({
            where: { warehouseId },
            include: {
                vehicle: true, // Prisma relation is 'vehicle' not 'vehicleId' from schema? Let me double check schema.
                // Schema says: vehicle Vehicle @relation...
            },
            orderBy: { createdAt: 'desc' }
        });

        // We also need product names for the items.
        // Prisma doesn't deep populate embedded Types/Interfaces easily if they are JSON blobs, but here 'loadedItems' is a composite array in schema?
        // Wait, schema says: loadedItems TripItem[]
        // type TripItem { productId String, ... }
        // This is a MongoDB embedded type. We can't "include" relation inside it easily in Prisma.
        // We might need to fetch products separately or the Client does it.
        // For simple list, Client might need names.
        // Let's fetch all products involved or handle it on client.
        // Actually, for performance, let's just return trips. Client can map if it has products context, or we enrich here.

        // Enriching with product names manually
        const productIds = new Set<string>();
        trips.forEach(t => t.loadedItems.forEach(i => productIds.add(i.productId)));

        const products = await prisma.product.findMany({
            where: { id: { in: Array.from(productIds) } },
            select: { id: true, name: true, sku: true }
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        const enrichedTrips = trips.map(t => ({
            ...t,
            loadedItems: t.loadedItems.map(i => ({
                ...i,
                productName: productMap.get(i.productId)?.name || "Unknown",
                sku: productMap.get(i.productId)?.sku || ""
            }))
        }));

        return NextResponse.json(enrichedTrips);
    } catch (error) {
        console.error("Fetch trips error", error);
        return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
    }
}
