import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
        }

        let { name, sku, quantity, price, location, pack, flavour, invoiceCost } = await req.json();
        
        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        await dbConnect();

        if (!warehouseId) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        // Auto-generate SKU if not provided
        if (!sku) {
            const base = (name || "").substring(0, 3).toUpperCase();
            const flav = (flavour || "").substring(0, 3).toUpperCase();
            const pck = (pack || "").substring(0, 3).toUpperCase();
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
            sku = `${base}-${flav}-${pck}-${random}`.replace(/-+/g, "-");
        }

        const product = await Product.create({
            name,
            sku,
            quantity,
            price,
            location,
            pack,
            flavour,
            invoiceCost,
            warehouseId
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        
        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        
        if (!warehouseId) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
        }
        
        const filter = warehouseId ? { warehouseId } : {};
        const products = await Product.find(filter).sort({ createdAt: -1 });
        
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
