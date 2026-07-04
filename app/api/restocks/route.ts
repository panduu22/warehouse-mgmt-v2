import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Restock from "@/models/Restock";
import Warehouse from "@/models/Warehouse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// ── POST /api/restocks ────────────────────────────────────────────────────────
// Body: { items: [{ productId, qtyAdded }] }
// Atomically increments product quantities and creates a Restock record.
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { items } = await req.json();

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "No items provided" }, { status: 400 });
        }

        await dbConnect();

        // ── Resolve warehouse context ──────────────────────────────────────────
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        const warehouse = await Warehouse.findById(warehouseId);
        const warehouseName = warehouse?.name ?? "Unknown Warehouse";

        // ── Resolve user ───────────────────────────────────────────────────────
        const user = session.user as any;
        const userId = user.id || user._id;
        const userName = user.name || user.email || "Unknown User";

        // ── Validate all products exist ────────────────────────────────────────
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return NextResponse.json(
                    { error: `Product not found: ${item.productId}` },
                    { status: 404 }
                );
            }
        }

        // ── Increment stock for all items ──────────────────────────────────────
        for (const item of items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: item.qtyAdded },
            });
        }

        // ── Generate human-readable restock ID ────────────────────────────────
        // Format: RST-YYYYMMDD-XXXX (daily sequence)
        const now = new Date();
        const dateStr = now
            .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
            .replace(/-/g, ""); // e.g. "20260704"

        const prefix = `RST-${dateStr}-`;
        const todayStart = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00+05:30`);
        const count = await Restock.countDocuments({
            warehouseId,
            createdAt: { $gte: todayStart },
        });
        const seq = String(count + 1).padStart(4, "0");
        const restockId = `${prefix}${seq}`;

        // ── Save restock record ────────────────────────────────────────────────
        const restock = await Restock.create({
            restockId,
            warehouseId,
            userId,
            userName,
            warehouseName,
            items,
            status: "CONFIRMED",
        });

        // ── Log activity ───────────────────────────────────────────────────────
        await logActivity({
            userId,
            warehouseId,
            action: "RESTOCK",
            details: `Restocked ${items.length} product(s). Restock ID: ${restockId}`,
            targetId: restock._id.toString(),
            targetModel: "Product",
        });

        return NextResponse.json(restock, { status: 201 });
    } catch (error) {
        console.error("Restock create error:", error);
        return NextResponse.json({ error: "Failed to create restock" }, { status: 500 });
    }
}

// ── GET /api/restocks ─────────────────────────────────────────────────────────
// Returns all restocks for the active warehouse, newest first.
export async function GET() {
    try {
        await dbConnect();

        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
        }

        const filter = warehouseId ? { warehouseId } : {};
        const restocks = await Restock.find(filter).sort({ createdAt: -1 });

        return NextResponse.json(restocks);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch restocks" }, { status: 500 });
    }
}
