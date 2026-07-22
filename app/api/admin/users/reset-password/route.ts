import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { logActivity } from "@/lib/activity";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const callerRole = (session?.user as any)?.role;

    // Only SUPER_ADMIN and WAREHOUSE_ADMIN can reset passwords
    if (!session || !["SUPER_ADMIN", "WAREHOUSE_ADMIN"].includes(callerRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { userId, newPassword } = await req.json();

        if (!userId || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
        }

        await dbConnect();

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Warehouse Admin can only reset password of users assigned to their managed warehouse
        if (callerRole === "WAREHOUSE_ADMIN") {
            const callerUser = await User.findOne({ email: (session.user as any).email });
            const adminWarehouse = callerUser?.warehouseAdminOf?.toString();
            
            const isAssigned = targetUser.assignedWarehouses?.some(
                (w: any) => w.warehouseId.toString() === adminWarehouse
            );
            
            if (!adminWarehouse || !isAssigned) {
                return NextResponse.json(
                    { error: "You can only reset passwords for users in your warehouse." },
                    { status: 403 }
                );
            }
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(newPassword, salt);
        targetUser.password = hashedPassword;
        await targetUser.save();

        const cookieStore = await cookies();
        const activeWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        await logActivity({
            userId: (session.user as any).id,
            warehouseId: activeWarehouseId,
            action: "UPDATE_USER",
            details: `Reset password for user ${targetUser.email}.`,
            targetModel: "User",
        });

        return NextResponse.json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("Error resetting password:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
