import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Warehouse from "@/models/Warehouse";
import { logActivity } from "@/lib/activity";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const callerRole = (session?.user as any)?.role;

    // Only SUPER_ADMIN and WAREHOUSE_ADMIN can assign users
    if (!session || !["SUPER_ADMIN", "WAREHOUSE_ADMIN"].includes(callerRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { emails, warehouseId, role: assignedRole, password } = await req.json();

        if (!emails || !Array.isArray(emails) || !warehouseId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // ─── WAREHOUSE ADMIN guards ────────────────────────────────────────────
        if (callerRole === "WAREHOUSE_ADMIN") {
            // Warehouse Admins can ONLY create STAFF — never another WAREHOUSE_ADMIN
            if (assignedRole && assignedRole !== "STAFF") {
                return NextResponse.json(
                    { error: "Warehouse Admins can only create Staff users." },
                    { status: 403 }
                );
            }

            // Warehouse Admins can only assign to their own warehouse
            const callerUser = await User.findOne({ email: (session.user as any).email });
            const adminWarehouse = callerUser?.warehouseAdminOf?.toString();
            if (!adminWarehouse || adminWarehouse !== warehouseId) {
                return NextResponse.json(
                    { error: "You can only assign users to your own warehouse." },
                    { status: 403 }
                );
            }
        }

        await dbConnect();

        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        // Determine the role to assign
        // SUPER_ADMIN can pick any role; WAREHOUSE_ADMIN always creates STAFF
        const targetRole: "WAREHOUSE_ADMIN" | "STAFF" =
            callerRole === "SUPER_ADMIN" && assignedRole === "WAREHOUSE_ADMIN"
                ? "WAREHOUSE_ADMIN"
                : "STAFF";

        // ─── WAREHOUSE_ADMIN assignment constraints (SUPER_ADMIN only) ─────────
        if (targetRole === "WAREHOUSE_ADMIN") {
            // One warehouse can have only one Warehouse Admin
            const existingAdmin = await User.findOne({
                role: "WAREHOUSE_ADMIN",
                "assignedWarehouses.warehouseId": warehouseId
            });
            if (existingAdmin) {
                return NextResponse.json(
                    { error: "❌ This warehouse already has a Warehouse Admin assigned." },
                    { status: 409 }
                );
            }

            // Each email being assigned must not already be a Warehouse Admin elsewhere
            for (let email of emails) {
                email = email.trim().toLowerCase();
                const existingUser = await User.findOne({ email, role: "WAREHOUSE_ADMIN" });
                if (existingUser) {
                    return NextResponse.json(
                        { error: `❌ ${email} is already assigned as a Warehouse Admin.` },
                        { status: 409 }
                    );
                }
            }
        }

        const grantedAt = new Date();
        const expiresAt = new Date(grantedAt);
        expiresAt.setDate(expiresAt.getDate() + 365);

        const updatedUsers = [];
        const salt = bcrypt.genSaltSync(10);
        const defaultHashedPassword = bcrypt.hashSync("password123", salt);
        const customHashedPassword = password ? bcrypt.hashSync(password, salt) : null;

        for (let email of emails) {
            email = email.trim().toLowerCase();
            if (!email) continue;

            let user = await User.findOne({ email });
            if (!user) {
                user = new User({
                    name: email.split("@")[0],
                    email,
                    role: targetRole,
                    password: customHashedPassword || defaultHashedPassword,
                    isActive: true,
                });
            } else {
                user.role = targetRole;
                if (customHashedPassword) {
                    user.password = customHashedPassword;
                } else if (!user.password) {
                    user.password = defaultHashedPassword;
                }
            }

            // Enforce 1:1 mapping by overwriting the array
            user.assignedWarehouses = [{
                warehouseId,
                grantedAt,
                expiresAt,
            }] as any;

            user.activeWarehouseId = warehouseId;

            if (targetRole === "WAREHOUSE_ADMIN") {
                // Track which warehouse this admin manages
                user.warehouseAdminOf = warehouseId;
                // Also update the Warehouse's adminId reference
                await Warehouse.findByIdAndUpdate(warehouseId, { adminId: user._id });
            }

            await user.save();
            updatedUsers.push(user);
        }

        const cookieStore = await cookies();
        const activeWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        await logActivity({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userId: (session.user as any).id,
            warehouseId: activeWarehouseId,
            action: "ASSIGN_WAREHOUSE",
            details: `Assigned ${updatedUsers.length} user(s) as ${targetRole} to ${warehouse.name}.`,
            targetModel: "Warehouse",
        });

        return NextResponse.json({ success: true, updatedCount: updatedUsers.length });
    } catch (error) {
        console.error("Error assigning warehouses:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
