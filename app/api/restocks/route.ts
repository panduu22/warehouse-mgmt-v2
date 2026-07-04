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

    let items: any[];
    try {
        const body = await req.json();
        items = body.items;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

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

    const warehouseOid = new mongoose.Types.ObjectId(warehouseId);
    const warehouse = await Warehouse.findById(warehouseOid);
    const warehouseName = warehouse?.name ?? "Unknown Warehouse";

    // ── Resolve user ───────────────────────────────────────────────────────
    const user = session.user as any;
    const userIdRaw = user.id || user._id;
    const userName = user.name || user.email || "Unknown User";

    let userOid: mongoose.Types.ObjectId;
    try {
        userOid = new mongoose.Types.ObjectId(userIdRaw);
    } catch {
        console.error("Restock: could not cast userId to ObjectId, raw value:", userIdRaw);
        userOid = new mongoose.Types.ObjectId();
    }

    // ── Validate all products and collect product data ────────────────────
    const enrichedItems: any[] = [];
    for (const item of items) {
        let product: any;
        try {
            product = await Product.findOne({ _id: item.productId, warehouseId: warehouseOid }).lean();
        } catch (e) {
            console.error("Restock: product lookup failed for", item.productId, e);
            return NextResponse.json({ error: `Product lookup failed: ${item.productId}` }, { status: 500 });
        }
        if (!product) {
            return NextResponse.json(
                { error: `Product not found in active warehouse: ${item.productId}` },
                { status: 404 }
            );
        }
        // Enrich with authoritative product data — never rely on client-supplied pack/flavour
        enrichedItems.push({
            productId: product._id,
            pack: product.pack || item.pack || "",
            flavour: product.flavour || item.flavour || "",
            bottlesPerPack: product.bottlesPerPack || item.bottlesPerPack || 1,
            qtyAdded: Number(item.qtyAdded) || 0,
        });
    }

    // ── Increment stock ────────────────────────────────────────────────────
    for (const item of enrichedItems) {
        try {
            await Product.findOneAndUpdate(
                { _id: item.productId, warehouseId: warehouseOid },
                { $inc: { quantity: item.qtyAdded } }
            );
        } catch (e) {
            console.error("Restock: stock increment failed for", item.productId, e);
            return NextResponse.json({ error: `Stock update failed: ${item.productId}` }, { status: 500 });
        }
    }

    // ── Generate collision-safe restock ID ────────────────────────────────
    const now = new Date();
    const dateStr = now
        .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
        .replace(/-/g, "");
    const prefix = `RST-${dateStr}-`;
    const todayStart = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00+05:30`);

    let count = 0;
    try {
        count = await Restock.countDocuments({ warehouseId: warehouseOid, createdAt: { $gte: todayStart } });
    } catch (e) {
        console.error("Restock: countDocuments failed", e);
    }

    const seq = String(count + 1).padStart(4, "0");
    const tiebreaker = Date.now().toString(36).slice(-4).toUpperCase();
    const restockId = `${prefix}${seq}-${tiebreaker}`;

    // ── Save restock record ────────────────────────────────────────────────
    let restock: any;
    try {
        restock = await Restock.create({
            restockId,
            warehouseId: warehouseOid,
            userId: userOid,
            userName,
            warehouseName,
            items: enrichedItems,
            status: "CONFIRMED",
        });
    } catch (e: any) {
        console.error("Restock: Restock.create() failed:", e?.message, JSON.stringify(e?.errors));
        return NextResponse.json({ error: `Failed to save restock record: ${e?.message}` }, { status: 500 });
    }

    // ── Log activity (non-fatal) ───────────────────────────────────────────
    await logActivity({
        userId: userOid.toString(),
        warehouseId,
        action: "RESTOCK",
        details: `Restocked ${items.length} product(s). Restock ID: ${restockId}`,
        targetId: restock._id.toString(),
        targetModel: "Product",
    });

    return NextResponse.json(restock, { status: 201 });
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
