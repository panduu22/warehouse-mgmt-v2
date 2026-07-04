import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Restock from "@/models/Restock";

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
        const restock = await Restock.findById(id).populate("items.productId");
        if (!restock) {
            return NextResponse.json({ error: "Restock not found" }, { status: 404 });
        }
        return NextResponse.json(restock);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch restock" }, { status: 500 });
    }
}
