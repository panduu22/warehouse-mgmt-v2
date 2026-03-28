import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { warehouseId } = await req.json();
        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        await dbConnect();
        const userId = (session.user as any).id;
        const user = await User.findById(userId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Remove from assignedWarehouses
        user.assignedWarehouses = user.assignedWarehouses.filter(
            (aw: any) => aw.warehouseId.toString() !== warehouseId
        );

        // If it was the active warehouse, reset it
        if (user.activeWarehouseId && user.activeWarehouseId.toString() === warehouseId) {
            if (user.assignedWarehouses.length > 0) {
                user.activeWarehouseId = user.assignedWarehouses[0].warehouseId;
            } else {
                user.activeWarehouseId = undefined;
            }
        }

        await user.save();

        return NextResponse.json({ 
            success: true, 
            activeWarehouseId: user.activeWarehouseId 
        });
    } catch (error) {
        console.error("Error leaving warehouse:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
