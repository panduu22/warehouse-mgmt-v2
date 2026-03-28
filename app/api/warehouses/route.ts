import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        await dbConnect();

        let query = {};
        if (user.role !== "ADMIN") {
            const now = new Date();
            const validWarehouseIds = (user.assignedWarehouses || [])
                .filter((w: any) => new Date(w.expiresAt) > now)
                .map((w: any) => w.warehouseId);
            
            query = { _id: { $in: validWarehouseIds } };
        }

        const warehouses = await Warehouse.find(query).sort({ createdAt: 1 });
        return NextResponse.json(warehouses);
    } catch (e) {
        console.error("Error fetching warehouses:", e);
        return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { name, address, isMain } = await req.json();
        await dbConnect();

        // Prevent multiple main warehouses
        if (isMain) {
            await Warehouse.updateMany({}, { isMain: false });
        }

        const warehouse = await Warehouse.create({
            name,
            address,
            isMain: isMain || false,
            // @ts-ignore
            createdBy: session.user.id
        });

        // Get all products from the main warehouse to clone
        const mainWarehouse = await Warehouse.findOne({ isMain: true });
        if (mainWarehouse && mainWarehouse._id.toString() !== warehouse._id.toString()) {
            const mainProducts = await Product.find({ warehouseId: mainWarehouse._id });
            if (mainProducts.length > 0) {
                const newStock = mainProducts.map(p => ({
                    name: p.name,
                    sku: p.sku.replace(/-\d{4}$/, `-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`), // Generate a unique suffix for the SKU
                    quantity: 0,
                    price: p.price,
                    location: p.location || "",
                    pack: p.pack,
                    flavour: p.flavour,
                    invoiceCost: p.invoiceCost,
                    warehouseId: warehouse._id
                }));
                await Product.insertMany(newStock);
            }
        }

        return NextResponse.json(warehouse, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const url = new URL(req.url);
        const warehouseId = url.searchParams.get("id");

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        await dbConnect();
        
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
             return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }
        
        if (warehouse.isMain) {
             return NextResponse.json({ error: "Cannot delete the Main Warehouse" }, { status: 400 });
        }

        // 1. Remove this warehouse from all users' assignedWarehouses
        // @ts-ignore
        const User = (await import("@/models/User")).default;
        await User.updateMany(
            { "assignedWarehouses.warehouseId": warehouseId },
            { $pull: { assignedWarehouses: { warehouseId: warehouseId } } }
        );

        // 2. Reset activeWarehouseId for users who were using this warehouse
        await User.updateMany(
            { activeWarehouseId: warehouseId },
            { $set: { activeWarehouseId: null } }
        );

        // 3. Update all access requests for this warehouse to REJECTED
        // @ts-ignore
        const AccessRequest = (await import("@/models/AccessRequest")).default;
        await AccessRequest.updateMany(
            { warehouseId: warehouseId },
            { $set: { status: "REJECTED", adminNotes: "Warehouse was deleted by administrator." } }
        );

        // 4. Delete all products associated with this warehouse
        await Product.deleteMany({ warehouseId });
        
        // 5. Delete warehouse
        await Warehouse.findByIdAndDelete(warehouseId);

        return NextResponse.json({ message: "Warehouse and its stock deleted successfully" }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to delete warehouse" }, { status: 500 });
    }
}
