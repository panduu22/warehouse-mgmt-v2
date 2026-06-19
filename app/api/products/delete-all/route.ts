import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = session.user as any;
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden. Only admins can delete all stock." }, { status: 403 });
        }

        await dbConnect();

        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        const warehouse = await Warehouse.findById(warehouseId);

        const result = await Product.deleteMany({ warehouseId });

        await logActivity({
            userId: user.id || user._id,
            warehouseId: warehouseId,
            action: "DELETE_ALL_PRODUCTS",
            details: `Deleted all ${result.deletedCount} products from warehouse ${warehouse?.name || warehouseId}.`,
        });

        return NextResponse.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        console.error("Error deleting all stock:", error);
        return NextResponse.json({ error: "Failed to delete all stock" }, { status: 500 });
    }
}
