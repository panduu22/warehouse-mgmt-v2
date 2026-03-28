import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Warehouse from "@/models/Warehouse"; // Needed to register the model for populate

export async function GET() {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await dbConnect();
        
        // Find users who are STAFF and have at least one warehouse assignment
        let users = await User.find({ 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            _id: { $ne: (session.user as any).id },
            role: "STAFF",
            "assignedWarehouses.0": { $exists: true }
        })
        .select("name email image assignedWarehouses role")
        .populate("assignedWarehouses.warehouseId", "name location")
        .lean();

        // Extra safety: Filter out users where all their warehouses were nullified (deleted previously)
        users = users.filter((u: any) => 
            u.assignedWarehouses && u.assignedWarehouses.some((aw: any) => aw.warehouseId !== null)
        );

        // Also fetch user's active warehouse object just in case we need it
        const populatedUsers = await User.populate(users, { path: "activeWarehouseId", select: "name" });

        return NextResponse.json(populatedUsers);
    } catch (error) {
        console.error("Error fetching admin users list:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
