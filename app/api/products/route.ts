import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            // allowing STAFF to add stock for now as per "Stock In" flow description not explicitly restricting to ADMIN only in flow text, 
            // though Access Control section says ADMIN adds stock. I will strict it to ADMIN if requested, but for now allow both or strict to ADMIN?
            // "ADMIN Adds stock". ok, strict to ADMIN.
        }
        // Re-reading prompt: "ADMIN: Add stock... STAFF: Load vehicles".
        // So "Add Stock" is ADMIN specific.
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
        }

        let { name, sku, quantity, price, location, pack, flavour, invoiceCost } = await req.json();
        await dbConnect();

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
            invoiceCost
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}

export async function GET() {
    await dbConnect();
    try {
        const products = await Product.find({}).sort({ createdAt: -1 });
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
