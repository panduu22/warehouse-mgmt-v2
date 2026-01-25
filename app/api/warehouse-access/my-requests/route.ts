import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const db = await getDb();
        const user = await db.collection("User").findOne({ email: session.user.email });

        if (!user) return NextResponse.json([]);

        const myAccess = await db.collection("WarehouseAccess")
            .find({ userId: user._id })
            .toArray();

        const formattedAccess = myAccess.map(a => ({
            ...a,
            id: a._id.toString(),
            _id: undefined,
            userId: a.userId.toString(),
            warehouseId: a.warehouseId.toString()
        }));

        return NextResponse.json(formattedAccess ?? []);
    } catch (error) {
        console.error("Error fetching my access", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
