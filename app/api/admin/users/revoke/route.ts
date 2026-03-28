import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import AccessRequest from "@/models/AccessRequest";

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const warehouseId = searchParams.get("warehouseId");

        if (!userId || !warehouseId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        await dbConnect();

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Remove the warehouse from assignedWarehouses
        if (user.assignedWarehouses) {
            user.assignedWarehouses = user.assignedWarehouses.filter(
                (w: any) => w.warehouseId.toString() !== warehouseId
            );
        }

        // If it was their active warehouse, clear it
        if (user.activeWarehouseId && user.activeWarehouseId.toString() === warehouseId) {
            if (user.assignedWarehouses && user.assignedWarehouses.length > 0) {
                user.activeWarehouseId = user.assignedWarehouses[0].warehouseId;
            } else {
                user.activeWarehouseId = undefined;
            }
        }

        await user.save();

        // Also proactively mark any APPROVED requests for this warehouse as REVOKED
        await AccessRequest.updateMany(
            { userId, warehouseId, status: "APPROVED" },
            { $set: { status: "REJECTED", adminNotes: "Access revoked by administrator." } }
        );

        return NextResponse.json({ success: true, message: "Access revoked" });
    } catch (error) {
        console.error("Error revoking warehouse access:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
