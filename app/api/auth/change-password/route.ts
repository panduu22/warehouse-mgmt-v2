import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { logActivity } from "@/lib/activity";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Missing required fields or invalid new password length." }, { status: 400 });
        }

        await dbConnect();

        const userEmail = (session.user as any).email.trim().toLowerCase();
        const user = await User.findOne({ email: userEmail });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify current password
        if (!user.password || !bcrypt.compareSync(currentPassword, user.password)) {
            return NextResponse.json({ error: "Incorrect current password." }, { status: 401 });
        }

        // Hash new password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(newPassword, salt);

        user.password = hashedPassword;
        user.mustChangePassword = false;
        await user.save();

        await logActivity({
            userId: user._id.toString(),
            action: "UPDATE_USER",
            details: `User ${user.email} changed their password.`,
            targetModel: "User",
        });

        return NextResponse.json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("Error changing password:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
