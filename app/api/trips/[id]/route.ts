import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "STAFF")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const { returnedItems, status, verifiedAt } = await req.json();

        if (status !== "VERIFIED") {
            return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
        }

        const trip = await prisma.$transaction(async (tx) => {
            const trip = await tx.trip.findUnique({ where: { id } });
            if (!trip) throw new Error("Trip not found");
            if (trip.status === "VERIFIED") throw new Error("Trip already verified");

            // Process Returns
            // returnedItems: [{ productId, qtyReturned }]
            // We need to update the embedded loadedItems list in Trip with the qtyReturned values.
            // And also add the `qtyReturned` back to Product stock.

            const updatedLoadedItems = trip.loadedItems.map((item: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const returned = returnedItems.find((r: any) => r.productId === item.productId);
                return {
                    ...item,
                    qtyReturned: returned ? Number(returned.qtyReturned) : 0
                };
            });

            // Update Product Stocks for returns
            for (const item of returnedItems) {
                if (item.qtyReturned > 0) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { quantity: { increment: Number(item.qtyReturned) } }
                    });
                }
            }

            // Update Trip
            const updatedTrip = await tx.trip.update({
                where: { id },
                data: {
                    status: "VERIFIED",
                    endTime: verifiedAt ? new Date(verifiedAt) : new Date(),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    verifiedBy: (session.user as any).id,
                    loadedItems: updatedLoadedItems
                }
            });

            // Release Vehicle
            await tx.vehicle.update({
                where: { id: trip.vehicleId },
                data: { status: "AVAILABLE" }
            });

            return updatedTrip;
        });

        return NextResponse.json(trip);
    } catch (error: any) {
        console.error("Verification failed", error);
        return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const trip = await prisma.trip.findUnique({
            where: { id },
            include: { vehicle: true }
        });

        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

        // Enrich with product details
        const productIds = trip.loadedItems.map((i: any) => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, pack: true, flavour: true }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        const enrichedTrip = {
            ...trip,
            loadedItems: trip.loadedItems.map((i: any) => ({
                ...i,
                product: productMap.get(i.productId) || { name: "Unknown" }
            }))
        };

        return NextResponse.json(enrichedTrip);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
    }
}
