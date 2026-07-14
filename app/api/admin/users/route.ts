import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Activity from "@/models/Activity";
import mongoose from "mongoose";
import Warehouse from "@/models/Warehouse"; // register model for populate

export const dynamic = "force-dynamic";

async function enrichWithLoginStatus(users: any[]) {
    if (!users.length) return users;
    const userIds = users.map((u) => new mongoose.Types.ObjectId(u._id.toString()));
    const loginActivities = await Activity.aggregate([
        { $match: { action: "USER_LOGIN", userId: { $in: userIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$userId", lastLoginAt: { $first: "$createdAt" } } },
    ]);
    const loginMap = new Map<string, Date>();
    for (const doc of loginActivities) {
        loginMap.set(doc._id.toString(), doc.lastLoginAt);
    }
    return users.map((u) => ({
        ...u,
        lastLoginAt: loginMap.get(u._id.toString()) ?? null,
    }));
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !(["SUPER_ADMIN", "WAREHOUSE_ADMIN"].includes((session.user as any).role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await dbConnect();
        
        // Return both WAREHOUSE_ADMIN and STAFF users so Super Admin can see full directory
        const users = await User.find({ 
            role: { $in: ["WAREHOUSE_ADMIN", "STAFF"] }
        })
        .select("name email image assignedWarehouses warehouseAdminOf role activeWarehouseId")
        .populate("assignedWarehouses.warehouseId", "name location")
        .populate("warehouseAdminOf", "name location")
        .populate("activeWarehouseId", "name")
        .lean();

        const enriched = await enrichWithLoginStatus(users);
        return NextResponse.json(enriched);
    } catch (error) {
        console.error("Error fetching admin users list:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
