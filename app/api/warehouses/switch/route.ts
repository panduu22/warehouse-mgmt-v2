import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireWarehouseAccess } from "@/lib/warehouseAccess";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { warehouseId } = await req.json();
        if (!warehouseId) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // ── RBAC: verify the user is allowed to switch to this warehouse ───
        const { denied, isSuperAdmin, assignedWarehouseIds } =
            await requireWarehouseAccess(session);
        if (denied) return denied;

        // Non-super-admins may only switch to their own assigned warehouses
        if (!isSuperAdmin && !assignedWarehouseIds.includes(warehouseId)) {
            return NextResponse.json(
                { error: "You do not have access to this warehouse." },
                { status: 403 }
            );
        }

        await dbConnect();
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Update user's active warehouse preference in DB
        if (session.user?.email) {
            await User.findOneAndUpdate(
                { email: session.user.email },
                { activeWarehouseId: warehouseId }
            );
        }

        // Set cookies
        const maxAge = isSuperAdmin ? 60 * 60 * 24 * 36500 : 60 * 60 * 24 * 365;
        const cookieStore = await cookies();
        cookieStore.set("activeWarehouseId", warehouseId.toString(), {
            path: "/",
            maxAge,
        });
        cookieStore.set("activeWarehouseName", warehouse.name, {
            path: "/",
            maxAge,
        });

        return NextResponse.json({
            success: true,
            activeWarehouseId: warehouse._id,
            activeWarehouseName: warehouse.name,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
