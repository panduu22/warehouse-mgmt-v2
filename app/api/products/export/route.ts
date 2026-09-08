import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Get active warehouse context — same logic as the stock page and other routes
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
            else warehouseId = undefined;
        }

        const warehouse = warehouseId ? await Warehouse.findById(warehouseId) : null;
        const filter = warehouseId ? { warehouseId } : {};

        // Fetch all products for this warehouse, same sort order as the stock page
        const products = await Product.find(filter)
            .select("pack flavour quantity bottlesPerPack")
            .sort({ displayOrder: 1, createdAt: 1 })
            .lean();

        return NextResponse.json({
            warehouseName: warehouse?.name || "Unit",
            products: products.map((p: any) => ({
                pack: p.pack || "",
                flavour: p.flavour || "",
                // Quantity is stored in bottles; format it the same way the UI does
                quantity: `${Math.floor(p.quantity / (p.bottlesPerPack || 1))}C + ${p.quantity % (p.bottlesPerPack || 1)}B`,
            })),
        });
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ error: "Failed to export stock data" }, { status: 500 });
    }
}
