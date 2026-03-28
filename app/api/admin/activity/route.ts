import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Activity from "@/models/Activity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
        }

        await dbConnect();
        
        // Extact URL query parameters for optional filtering
        const url = new URL(req.url);
        const limitStr = url.searchParams.get("limit");
        const limit = limitStr ? parseInt(limitStr, 10) : 50;
        
        // Get active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;
        
        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
        }
        
        // Build filter
        const filter: any = {};
        if (warehouseId) {
            filter.warehouseId = warehouseId;
        }

        const activities = await Activity.find(filter)
            .populate("userId", "name email image role")
            .populate("warehouseId", "name")
            .sort({ createdAt: -1 })
            .limit(limit);
            
        return NextResponse.json(activities);
    } catch (error) {
        console.error("Activity Fetch Error:", error);
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
    }
}
