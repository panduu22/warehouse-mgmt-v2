import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Warehouse from "@/models/Warehouse";
import { logActivity } from "@/lib/activity";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { userId, warehouseIds, durationDays } = await req.json();

        if (!userId || !warehouseIds || !Array.isArray(warehouseIds)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (durationDays || 365));

        // Create new assignments
        const newAssignments = warehouseIds.map(id => ({
            warehouseId: id,
            expiresAt
        }));

        // Replace or merge? 
        // User said "assign one or more warehouses". 
        // I'll merge (avoid duplicates)
        for (const newAs of newAssignments) {
            const existingIndex = userToUpdate.assignedWarehouses.findIndex(
                aw => aw.warehouseId.toString() === newAs.warehouseId.toString()
            );

            if (existingIndex > -1) {
                userToUpdate.assignedWarehouses[existingIndex].expiresAt = expiresAt;
            } else {
                userToUpdate.assignedWarehouses.push(newAs as any);
            }
        }

        await userToUpdate.save();

        const cookieStore = await cookies();
        const activeWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        // Log it
        await logActivity({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userId: (session.user as any).id,
            warehouseId: activeWarehouseId,
            action: "ASSIGN_WAREHOUSE",
            details: `Assigned ${warehouseIds.length} warehouse(s) to ${userToUpdate.name}.`,
            targetId: userToUpdate._id.toString(),
            targetModel: "User"
        });

        return NextResponse.json({ success: true, user: userToUpdate });
    } catch (error) {
        console.error("Error assigning warehouses:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
