import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
export const dynamic = "force-dynamic";
import Product from "@/models/Product";
import Vehicle from "@/models/Vehicle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity";
import {
    requireWarehouseAccess,
    resolveWarehouseId,
} from "@/lib/warehouseAccess";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── RBAC ──────────────────────────────────────────────────────────────
    const { denied, isSuperAdmin, assignedWarehouseIds } =
        await requireWarehouseAccess(session);
    if (denied) return denied;

    try {
        const { vehicleId, items } = await req.json();

        const [, cookieStore] = await Promise.all([dbConnect(), cookies()]);
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );
        if (!warehouseId) {
            return NextResponse.json(
                { error: "No warehouse context found" },
                { status: 400 }
            );
        }

        if (!vehicleId || !items || items.length === 0) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        for (const item of items) {
            const product = await Product.findOne({
                _id: item.productId,
                warehouseId,
            });
            if (!product) {
                return NextResponse.json(
                    {
                        error: `Product not found in active warehouse: ${item.productId}`,
                    },
                    { status: 404 }
                );
            }
            if (product.quantity < item.qtyLoaded) {
                return NextResponse.json(
                    { error: `Insufficient stock for ${product.name}` },
                    { status: 400 }
                );
            }
        }

        // Deduct stock
        for (const item of items) {
            await Product.findOneAndUpdate(
                { _id: item.productId, warehouseId },
                { $inc: { quantity: -item.qtyLoaded } }
            );
        }

        // Update Vehicle status
        await Vehicle.findByIdAndUpdate(vehicleId, { status: "IN_TRANSIT" });

        const trip = await Trip.create({
            vehicleId,
            loadedItems: items,
            status: "LOADED",
            warehouseId,
        });

        await logActivity({
            userId: (session.user as any).id || (session.user as any)._id,
            warehouseId: warehouseId.toString(),
            action: "LOAD_VEHICLE",
            details: `Loaded ${items.length} product(s) onto vehicle.`,
            targetId: trip._id.toString(),
            targetModel: "Trip",
        });

        return NextResponse.json(trip, { status: 201 });
    } catch (error) {
        console.error("Trip create error:", error);
        return NextResponse.json(
            { error: "Failed to create trip" },
            { status: 500 }
        );
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── RBAC ──────────────────────────────────────────────────────────────
    const { denied, isSuperAdmin, assignedWarehouseIds } =
        await requireWarehouseAccess(session);
    if (denied) return denied;

    try {
        const [, cookieStore] = await Promise.all([dbConnect(), cookies()]);
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );

        const filter = warehouseId ? { warehouseId } : {};

        const trips = await Trip.find(filter)
            .populate("vehicleId", "number driverName status")
            .populate(
                "loadedItems.productId",
                "name pack flavour price salePrice bottlesPerPack"
            )
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(trips);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch trips" },
            { status: 500 }
        );
    }
}
