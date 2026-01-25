import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const bill = await prisma.bill.findUnique({
            where: { id },
            include: {
                trip: {
                    include: {
                        vehicle: true
                    }
                },
                // Need to fetch generatedBy user details?
                generator: {
                    select: { name: true }
                },
                warehouse: {
                    select: { name: true, location: true }
                }
            }
        });

        if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });

        // Enrich Items with Product Info
        // Trip Loaded Items are JSON. We need to fetch product info.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemIds = bill.trip.loadedItems.map((i: any) => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, name: true, sku: true, price: true }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedItems = bill.trip.loadedItems.map((item: any) => {
            const product = productMap.get(item.productId);
            return {
                ...item,
                productName: product?.name || "Unknown",
                productSku: product?.sku || "",
                productPrice: product?.price || 0
            };
        });

        const enrichedBill = {
            ...bill,
            trip: {
                ...bill.trip,
                loadedItems: enrichedItems
            }
        };

        return NextResponse.json(enrichedBill);
    } catch (error) {
        console.error("Fetch bill error", error);
        return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 });
    }
}
