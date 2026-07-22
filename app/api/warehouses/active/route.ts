import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireWarehouseAccess } from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({
                activeWarehouseId: null,
                activeWarehouseName: "No Warehouse",
            });
        }

        // ── RBAC ────────────────────────────────────────────────────────────
        const { denied, isSuperAdmin, assignedWarehouseIds } =
            await requireWarehouseAccess(session);
        if (denied) {
            // If user has no warehouse assignment yet, return a graceful empty state
            return NextResponse.json({
                activeWarehouseId: null,
                activeWarehouseName: "No Warehouse",
            });
        }

        const user = await User.findOne({ email: session.user.email }).populate(
            "activeWarehouseId"
        );
        if (!user) {
            return NextResponse.json({
                activeWarehouseId: null,
                activeWarehouseName: "No Warehouse",
            });
        }

        const cookieStore = await cookies();
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        // If the DB has an active warehouse set, validate it against RBAC
        if (user.activeWarehouseId) {
            const dbWarehouse = user.activeWarehouseId as unknown as {
                _id: mongoose.Types.ObjectId;
                name: string;
            };
            const warehouseIdStr = dbWarehouse._id.toString();
            const warehouseName: string = dbWarehouse.name;

            // For non-super-admins: verify this warehouse is still in their assigned list
            if (!isSuperAdmin && !assignedWarehouseIds.includes(warehouseIdStr)) {
                // DB active warehouse no longer assigned — fall through to first assigned
            } else {
                // Sync cookie if stale
                if (cookieWarehouseId !== warehouseIdStr) {
                    // @ts-ignore
                    cookieStore.set("activeWarehouseId", warehouseIdStr, { path: "/" });
                    // @ts-ignore
                    cookieStore.set("activeWarehouseName", warehouseName, { path: "/" });
                }
                return NextResponse.json({
                    activeWarehouseId: warehouseIdStr,
                    activeWarehouseName: warehouseName,
                });
            }
        }

        // ── Fallback ─────────────────────────────────────────────────────────
        if (isSuperAdmin) {
            // SUPER_ADMIN: fall back to main warehouse
            const mainWarehouse = await Warehouse.findOne({ isMain: true });
            if (mainWarehouse) {
                return NextResponse.json({
                    activeWarehouseId: mainWarehouse._id,
                    activeWarehouseName: mainWarehouse.name,
                });
            }
        } else if (assignedWarehouseIds.length > 0) {
            // Non-super-admin: fall back to their FIRST assigned warehouse
            const firstAssigned = await Warehouse.findById(assignedWarehouseIds[0]);
            if (firstAssigned) {
                // Persist this as the active warehouse
                await User.findOneAndUpdate(
                    { email: session.user.email },
                    { activeWarehouseId: firstAssigned._id }
                );
                // @ts-ignore
                cookieStore.set("activeWarehouseId", firstAssigned._id.toString(), { path: "/" });
                // @ts-ignore
                cookieStore.set("activeWarehouseName", firstAssigned.name, { path: "/" });
                return NextResponse.json({
                    activeWarehouseId: firstAssigned._id,
                    activeWarehouseName: firstAssigned.name,
                });
            }
        }

        return NextResponse.json({
            activeWarehouseId: null,
            activeWarehouseName: "No Warehouse",
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({
            activeWarehouseId: null,
            activeWarehouseName: "Error",
        });
    }
}
