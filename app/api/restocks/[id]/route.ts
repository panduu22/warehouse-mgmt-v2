import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Restock from "@/models/Restock";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ── GET /api/restocks/[id] ────────────────────────────────────────────────────
// Fetches a single restock by its MongoDB _id, for receipt reprinting.
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        const restock = await Restock.findOne({ _id: id, warehouseId }).populate("items.productId");
        if (!restock) {
            return NextResponse.json({ error: "Restock not found" }, { status: 404 });
        }
        return NextResponse.json(restock);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch restock" }, { status: 500 });
    }
}
