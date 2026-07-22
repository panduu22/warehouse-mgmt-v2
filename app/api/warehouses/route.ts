import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import User from "@/models/User";
import { logActivity } from "@/lib/activity";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    requireWarehouseAccess,
    computeCapabilities,
} from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

// ─── GET /api/warehouses ────────────────────────────────────────────────────
// Returns ONLY the warehouses the authenticated user is permitted to see,
// plus capability flags so the frontend can render permission-aware UI.
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const { denied, isSuperAdmin, assignedWarehouseIds } =
            await requireWarehouseAccess(session);
        if (denied) return denied;

        let warehouses;
        if (isSuperAdmin) {
            warehouses = await Warehouse.find({}).sort({ createdAt: 1 });
        } else {
            // Filter to ONLY assigned warehouses — never expose others
            const objectIds = assignedWarehouseIds.map(
                (id) => new (require("mongoose").Types.ObjectId)(id)
            );
            warehouses = await Warehouse.find({
                _id: { $in: objectIds },
            }).sort({ createdAt: 1 });
        }

        const capabilities = computeCapabilities(isSuperAdmin, assignedWarehouseIds);

        // Return warehouses array annotated with capability flags so the client
        // can drive UI decisions from data, not scattered role checks.
        return NextResponse.json({ warehouses, capabilities });
    } catch (e) {
        console.error("Error fetching warehouses:", e);
        return NextResponse.json(
            { error: "Failed to fetch warehouses" },
            { status: 500 }
        );
    }
}

// ─── POST /api/warehouses ───────────────────────────────────────────────────
// SUPER_ADMIN only.
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { name, address, isMain } = await req.json();
        await dbConnect();

        if (isMain) {
            await Warehouse.updateMany({}, { isMain: false });
        }

        const warehouse = await Warehouse.create({
            name,
            address,
            isMain: isMain || false,
            createdBy: (session.user as any).id,
        });

        // Clone all products from the main warehouse into the new warehouse
        const mainWarehouse = await Warehouse.findOne({ isMain: true });
        if (
            mainWarehouse &&
            mainWarehouse._id.toString() !== warehouse._id.toString()
        ) {
            const mainProducts = await Product.find({
                warehouseId: mainWarehouse._id,
            }).sort({ displayOrder: 1 });
            if (mainProducts.length > 0) {
                const newStock = mainProducts.map((p) => ({
                    name: p.name,
                    sku: p.sku,
                    quantity: 0,
                    price: p.price,
                    location: p.location || "",
                    pack: p.pack,
                    flavour: p.flavour,
                    mrp: p.mrp,
                    salePrice: p.salePrice,
                    invoiceCost: p.invoiceCost,
                    bottlesPerPack: p.bottlesPerPack,
                    displayOrder: p.displayOrder,
                    warehouseId: warehouse._id,
                }));
                await Product.insertMany(newStock);
            }
        }

        await logActivity({
            userId: (session.user as any).id,
            warehouseId: warehouse._id.toString(),
            action: "CREATE_WAREHOUSE",
            details: `Created new warehouse "${warehouse.name}".`,
            targetId: warehouse._id.toString(),
            targetModel: "Warehouse",
        });

        return NextResponse.json(warehouse, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: "Failed to create warehouse" },
            { status: 500 }
        );
    }
}

// ─── DELETE /api/warehouses ─────────────────────────────────────────────────
// SUPER_ADMIN only.
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const url = new URL(req.url);
        const warehouseId = url.searchParams.get("id");

        if (!warehouseId) {
            return NextResponse.json(
                { error: "Warehouse ID is required" },
                { status: 400 }
            );
        }

        await dbConnect();

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return NextResponse.json(
                { error: "Warehouse not found" },
                { status: 404 }
            );
        }

        if (warehouse.isMain) {
            return NextResponse.json(
                { error: "Cannot delete the Main Warehouse" },
                { status: 400 }
            );
        }

        // Remove this warehouse from all users' assignedWarehouses
        await User.updateMany(
            { "assignedWarehouses.warehouseId": warehouseId },
            { $pull: { assignedWarehouses: { warehouseId: warehouseId } } }
        );

        // Reset activeWarehouseId for users who were using this warehouse
        await User.updateMany(
            { activeWarehouseId: warehouseId },
            { $set: { activeWarehouseId: null } }
        );

        // Update all access requests for this warehouse to REJECTED
        const AccessRequest = (await import("@/models/AccessRequest")).default;
        await AccessRequest.updateMany(
            { warehouseId: warehouseId },
            {
                $set: {
                    status: "REJECTED",
                    adminNotes: "Warehouse was deleted by administrator.",
                },
            }
        );

        // Delete all products associated with this warehouse
        await Product.deleteMany({ warehouseId });

        // Delete warehouse
        await Warehouse.findByIdAndDelete(warehouseId);

        await logActivity({
            userId: (session.user as any).id,
            action: "DELETE_WAREHOUSE",
            details: `Deleted warehouse "${warehouse.name}" and all associated stock.`,
            targetId: warehouseId,
            targetModel: "Warehouse",
        });

        return NextResponse.json(
            { message: "Warehouse and its stock deleted successfully" },
            { status: 200 }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { error: "Failed to delete warehouse" },
            { status: 500 }
        );
    }
}
