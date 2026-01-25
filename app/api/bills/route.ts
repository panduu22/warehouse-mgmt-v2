import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { tripId, date } = await req.json();

        // Check if bill exists
        const existingBill = await prisma.bill.findUnique({ where: { tripId } });
        if (existingBill) {
            return NextResponse.json({ error: "Bill already exists for this trip" }, { status: 400 });
        }

        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { warehouse: true } // Need to link bill to proper warehouse
        });

        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        if (trip.status !== "VERIFIED") {
            return NextResponse.json({ error: "Trip must be verified before billing" }, { status: 400 });
        }

        // Fetch products to calculate total
        // Note: In a real system, we should have stored 'priceAtLoad' in TripItems. 
        // Here we fetch current product price.
        // Prisma doesn't support population inside JSON types directy in query easily for calculation.
        // We will loop.

        const itemIds = trip.loadedItems.map((i: any) => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: itemIds } }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        let totalAmount = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trip.loadedItems.forEach((item: any) => {
            const sold = item.qtyLoaded - (item.qtyReturned || 0);
            const product = productMap.get(item.productId);
            if (product && sold > 0) {
                totalAmount += sold * product.price;
            }
        });

        // Create Bill
        const bill = await prisma.bill.create({
            data: {
                tripId,
                totalAmount,
                warehouseId: trip.warehouseId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                generatedBy: (session.user as any).id,
                generatedAt: date ? new Date(date) : new Date()
            }
        });

        return NextResponse.json(bill, { status: 201 });

    } catch (error) {
        console.error("Bill generation error", error);
        return NextResponse.json({ error: "Failed to generate bill" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) return NextResponse.json([], { status: 400 });

    try {
        // 1. Fetch Bills
        const bills = await prisma.bill.findMany({
            where: { warehouseId },
            include: {
                trip: {
                    include: { vehicle: true }
                }
            },
            orderBy: { generatedAt: 'desc' }
        });

        // 2. Fetch Pending Trips (Verified but no Bill) for this warehouse
        // We can do this efficiently by getting all Verified trips and excluding those present in bills.
        // Or finding Verified Trips where bill is null? Relation is 1-1 optional.
        const pendingTrips = await prisma.trip.findMany({
            where: {
                warehouseId,
                status: "VERIFIED",
                bill: { is: null } // Prisma way to check for absence of relation
            },
            include: {
                vehicle: true
            },
            orderBy: { endTime: 'desc' }
        });

        return NextResponse.json({
            bills,
            pendingTrips
        });

    } catch (error) {
        console.error("Bill fetch error", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
