import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "STAFF")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { name, sku, quantity, price, location, pack, flavour, invoiceCost, salePrice, warehouseId } = body;

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        // Auto-generate SKU if not provided
        let finalSku = sku;
        if (!finalSku) {
            const base = (name || "").substring(0, 3).toUpperCase();
            const flav = (flavour || "").substring(0, 3).toUpperCase();
            const pck = (pack || "").substring(0, 3).toUpperCase();
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
            finalSku = `${base}-${flav}-${pck}-${random}`.replace(/-+/g, "-");
        }

        const product = await prisma.product.create({
            data: {
                name,
                sku: finalSku,
                quantity: Number(quantity),
                price: Number(price),
                location,
                pack,
                flavour,
                invoiceCost: invoiceCost ? Number(invoiceCost) : null,
                salePrice: salePrice ? Number(salePrice) : null,
                warehouseId
            }
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error("Failed to create product", error);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) {
        return NextResponse.json([], { status: 400 });
    }

    try {
        const products = await prisma.product.findMany({
            where: {
                warehouseId: warehouseId
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
