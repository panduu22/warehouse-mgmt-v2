import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Restock from "@/models/Restock";
import RestockHistory from "@/models/RestockHistory";
import Warehouse from "@/models/Warehouse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { requireWarehouseAccess, resolveWarehouseId } from "@/lib/warehouseAccess";
import { isoDateIST, formatIST } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

// ── POST /api/restocks ────────────────────────────────────────────────────────
// Body: { items: [{ productId, qtyAdded }] }
// Atomically increments product quantities and creates a Restock record.
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ── RBAC ──────────────────────────────────────────────────────────────
    const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
    if (denied) return denied;

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
    const warehouseId = await resolveWarehouseId(
        cookieStore.get("activeWarehouseId")?.value,
        isSuperAdmin,
        assignedWarehouseIds
    );
    if (!warehouseId) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });

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

    // ── Duplicate prevention check ────────────────────────────────────────
    // If an identical restock was submitted in the last 3 seconds by the same user, prevent duplicate stock updates.
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const recentDuplicate = await RestockHistory.findOne({
        warehouseId: warehouseOid,
        "createdBy.userId": userOid,
        createdAt: { $gte: threeSecondsAgo },
    }).lean();

    if (recentDuplicate && recentDuplicate.products.length === items.length) {
        const itemIds = items.map((i) => String(i.productId)).sort();
        const dupIds = recentDuplicate.products.map((p) => String(p.productId)).sort();
        const isExactMatch = itemIds.every((id, idx) => id === dupIds[idx]);
        if (isExactMatch) {
            console.warn("Restock: duplicate submission detected and prevented within 3s window");
            return NextResponse.json(recentDuplicate, { status: 200 });
        }
    }

    // ── Validate all products and collect authoritative product snapshots ──
    const enrichedItems: any[] = [];
    const historyProducts: any[] = [];
    let totalCases = 0;
    let totalBottles = 0;
    let grandTotal = 0;

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

        const bpp = Number(product.bottlesPerPack || item.bottlesPerPack || 1);
        const qtyAdded = Number(item.qtyAdded) || 0;

        // Capture actual Cases and Bottles entered directly by user:
        const casesRestocked = item.casesRestocked !== undefined && item.casesRestocked !== null
            ? Math.max(0, Math.floor(Number(item.casesRestocked) || 0))
            : Math.max(0, Math.floor(qtyAdded / bpp));

        const bottlesRestocked = item.bottlesRestocked !== undefined && item.bottlesRestocked !== null
            ? Math.max(0, Math.floor(Number(item.bottlesRestocked) || 0))
            : Math.max(0, qtyAdded % bpp);

        // Invoice Cost per case: ALWAYS from product.invoiceCost (authoritative server snapshot)
        const invoiceCostPerCase = Number(product.invoiceCost) || 0;

        // Cost Calculation:
        // Case Cost = Cases × Invoice Cost per Case
        // Cost per Bottle = Invoice Cost per Case ÷ Bottles Per Case
        // Additional Bottle Cost = Bottles × Cost per Bottle
        // Product Total Cost = Case Cost + Additional Bottle Cost
        const caseCost = Math.round(casesRestocked * invoiceCostPerCase * 100) / 100;
        const costPerBottle = bpp > 0 ? (invoiceCostPerCase / bpp) : 0;
        const bottleCost = Math.round(bottlesRestocked * costPerBottle * 100) / 100;
        const productTotalCost = Math.round((caseCost + bottleCost) * 100) / 100;

        totalCases += casesRestocked;
        totalBottles += bottlesRestocked;
        grandTotal = Math.round((grandTotal + productTotalCost) * 100) / 100;

        // Enrich with authoritative product data for legacy Restock model
        enrichedItems.push({
            productId: product._id,
            pack: product.pack || item.pack || "",
            flavour: product.flavour || item.flavour || "",
            bottlesPerPack: bpp,
            qtyAdded,
        });

        // Historical snapshot data for RestockHistory
        const productName = product.name || [product.pack, product.flavour].filter(Boolean).join(" ") || "Product";
        historyProducts.push({
            productId: product._id,
            productNameSnapshot: productName,
            flavourSnapshot: product.flavour || item.flavour || "",
            packSizeSnapshot: product.pack || item.pack || "",
            casesRestocked,
            bottlesRestocked,
            bottlesPerPack: bpp,
            invoiceCostPerCase,
            caseCost,
            bottleCost,
            totalCost: productTotalCost,
        });
    }

    // ── Increment stock ────────────────────────────────────────────────────
    const updatedProductIds: mongoose.Types.ObjectId[] = [];
    try {
        for (const item of enrichedItems) {
            await Product.findOneAndUpdate(
                { _id: item.productId, warehouseId: warehouseOid },
                { $inc: { quantity: item.qtyAdded } }
            );
            updatedProductIds.push(item.productId);
        }
    } catch (e) {
        console.error("Restock: stock increment failed, performing rollback", e);
        for (const pid of updatedProductIds) {
            const item = enrichedItems.find((i) => i.productId.equals(pid));
            if (item) {
                await Product.findOneAndUpdate(
                    { _id: pid, warehouseId: warehouseOid },
                    { $inc: { quantity: -item.qtyAdded } }
                ).catch((err) => console.error("Rollback failed for", pid, err));
            }
        }
        return NextResponse.json({ error: "Stock update failed" }, { status: 500 });
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
        count = await RestockHistory.countDocuments({ warehouseId: warehouseOid, createdAt: { $gte: todayStart } });
    } catch (e) {
        console.error("Restock: countDocuments failed", e);
    }

    const seq = String(count + 1).padStart(4, "0");
    const tiebreaker = Date.now().toString(36).slice(-4).toUpperCase();
    const restockId = `${prefix}${seq}-${tiebreaker}`;
    const transactionId = restockId;

    const restockDate = isoDateIST(now);
    const restockTime = formatIST(now, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

    // ── Save restock records (legacy + new RestockHistory) ──────────────────
    let restock: any;
    let historyRecord: any;
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

        historyRecord = await RestockHistory.create({
            transactionId,
            warehouseId: warehouseOid,
            warehouseName,
            createdBy: {
                userId: userOid,
                userName,
                userEmail: user.email || "",
            },
            restockDate,
            restockTime,
            products: historyProducts,
            totalProducts: historyProducts.length,
            totalCases,
            totalBottles,
            grandTotal,
        });
    } catch (e: any) {
        console.error("Restock: record creation failed, rolling back stock", e?.message);
        for (const item of enrichedItems) {
            await Product.findOneAndUpdate(
                { _id: item.productId, warehouseId: warehouseOid },
                { $inc: { quantity: -item.qtyAdded } }
            ).catch((err) => console.error("Rollback failed for", item.productId, err));
        }
        return NextResponse.json({ error: `Failed to save restock record: ${e?.message}` }, { status: 500 });
    }

    // ── Log activity (non-fatal) ───────────────────────────────────────────
    await logActivity({
        userId: userOid.toString(),
        warehouseId,
        action: "RESTOCK",
        details: `Restocked ${historyProducts.length} product(s) (${totalCases} cases, ${totalBottles} bottles). Transaction ID: ${transactionId}`,
        targetId: historyRecord._id.toString(),
        targetModel: "Product",
    });

    return NextResponse.json({
        ...restock.toObject(),
        transactionId,
        historyId: historyRecord._id,
        totalCases,
        totalBottles,
        grandTotal,
    }, { status: 201 });
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // ── RBAC ──────────────────────────────────────────────────────────────
        const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
        if (denied) return denied;

        const [, cookieStore] = await Promise.all([dbConnect(), cookies()]);

        const warehouseId = await resolveWarehouseId(
            cookieStore.get("activeWarehouseId")?.value,
            isSuperAdmin,
            assignedWarehouseIds
        );

        const filter = warehouseId ? { warehouseId } : {};
        const restocks = await Restock.find(filter).sort({ createdAt: -1 }).lean();

        return NextResponse.json(restocks);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch restocks" }, { status: 500 });
    }
}
