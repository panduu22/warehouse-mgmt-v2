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
        
        // Find all users who are STAFF
        const users = await User.find({ 
            role: "STAFF"
        })
        .select("name email image assignedWarehouses role activeWarehouseId")
        .populate("assignedWarehouses.warehouseId", "name location")
        .populate("activeWarehouseId", "name")
        .lean();

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching admin users list:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
