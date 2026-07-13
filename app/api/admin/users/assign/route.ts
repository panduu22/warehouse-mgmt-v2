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
        const { emails, warehouseId } = await req.json();

        if (!emails || !Array.isArray(emails) || !warehouseId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        const grantedAt = new Date();
        const expiresAt = new Date(grantedAt);
        expiresAt.setDate(expiresAt.getDate() + 365);

        const updatedUsers = [];

        for (let email of emails) {
            email = email.trim().toLowerCase();
            if (!email) continue;

            let user = await User.findOne({ email });
            if (!user) {
                user = new User({
                    name: email.split("@")[0], // fallback name
                    email: email,
                    role: "STAFF"
                });
            }

            // Enforce 1:1 mapping by overwriting the array
            user.assignedWarehouses = [{
                warehouseId: warehouseId,
                grantedAt,
                expiresAt
            }] as any;

            user.activeWarehouseId = warehouseId;
            
            await user.save();
            updatedUsers.push(user);
        }

        const cookieStore = await cookies();
        const activeWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        // Log it
        await logActivity({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userId: (session.user as any).id,
            warehouseId: activeWarehouseId,
            action: "ASSIGN_WAREHOUSE",
            details: `Assigned ${updatedUsers.length} user(s) to ${warehouse.name}.`,
            targetModel: "Warehouse"
        });

        return NextResponse.json({ success: true, updatedCount: updatedUsers.length });
    } catch (error) {
        console.error("Error assigning warehouses:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
