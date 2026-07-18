import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await dbConnect();

        // Always load the authenticated user from DB to get the ground-truth
        // activeWarehouseId. We cannot trust the cookie alone because it may
        // point to a warehouse that was set in a previous session (e.g. "Main
        // Warehouse") while the DB now has a different approved warehouse set.
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ activeWarehouseId: null, activeWarehouseName: "No Warehouse" });
        }

        const user = await User.findOne({ email: session.user.email }).populate("activeWarehouseId");
        if (!user) {
            return NextResponse.json({ activeWarehouseId: null, activeWarehouseName: "No Warehouse" });
        }

        const cookieStore = await cookies();
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        // The DB is the source of truth for which warehouse is active.
        if (user.activeWarehouseId) {
            // After .populate(), activeWarehouseId is the full Warehouse document.
            const dbWarehouse = user.activeWarehouseId as unknown as {
                _id: mongoose.Types.ObjectId;
                name: string;
            };
            const warehouseIdStr = dbWarehouse._id.toString();
            const warehouseName: string = dbWarehouse.name;

            // Keep the cookie in sync so all cookie-reading API routes (bills,
            // trips, analytics, etc.) immediately get the correct warehouse.
            if (cookieWarehouseId !== warehouseIdStr) {
                // @ts-ignore – cookies().set() is valid in Route Handlers
                cookieStore.set("activeWarehouseId", warehouseIdStr, { path: "/" });
                // @ts-ignore
                cookieStore.set("activeWarehouseName", warehouseName, { path: "/" });
            }

            return NextResponse.json({
                activeWarehouseId: warehouseIdStr,
                activeWarehouseName: warehouseName,
            });
        }

        // User has no active warehouse in DB.
        // Only admins fall back to "Main Warehouse" — regular users should be
        // redirected to the access request page (handled by app/page.tsx).
        const isAdmin = ["SUPER_ADMIN", "WAREHOUSE_ADMIN"].includes((session.user as any).role);
        if (isAdmin) {
            const mainWarehouse = await Warehouse.findOne({ isMain: true });
            if (mainWarehouse) {
                return NextResponse.json({
                    activeWarehouseId: mainWarehouse._id,
                    activeWarehouseName: mainWarehouse.name,
                });
            }
        }

        return NextResponse.json({ activeWarehouseId: null, activeWarehouseName: "No Warehouse" });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ activeWarehouseId: null, activeWarehouseName: "Error" });
    }
}
