import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

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

        const db = await getDb();
        const newProduct = {
            name,
            sku: finalSku,
            quantity: Number(quantity),
            price: Number(price),
            location,
            pack,
            flavour,
            invoiceCost: invoiceCost ? Number(invoiceCost) : null,
            salePrice: salePrice ? Number(salePrice) : null,
            warehouseId: new ObjectId(warehouseId),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("Product").insertOne(newProduct);

        return NextResponse.json({
            ...newProduct,
            id: result.insertedId.toString(),
            _id: undefined
        }, { status: 201 });
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
        const db = await getDb();
        const products = await db.collection("Product")
            .find({ warehouseId: new ObjectId(warehouseId) })
            .sort({ createdAt: -1 })
            .toArray();

        const formattedProducts = products.map(p => ({
            ...p,
            id: p._id.toString(),
            _id: undefined
        }));

        return NextResponse.json(formattedProducts);
    } catch (error) {
        console.error("Failed to fetch products", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
