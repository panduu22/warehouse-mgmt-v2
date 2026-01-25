import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { warehouseId } = await req.json();
        const db = await getDb();

        const user = await db.collection("User").findOne({ email: session.user.email });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Check for existing request
        const existing = await db.collection("WarehouseAccess").findOne({
            userId: user._id,
            warehouseId: new ObjectId(warehouseId)
        });

        if (existing) {
            return NextResponse.json({ error: "Request already exists" }, { status: 400 });
        }

        const newRequest = {
            userId: user._id,
            warehouseId: new ObjectId(warehouseId),
            status: "PENDING",
            role: "STAFF",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("WarehouseAccess").insertOne(newRequest);

        return NextResponse.json({
            ...newRequest,
            id: result.insertedId.toString(),
            _id: undefined
        });
    } catch (error) {
        console.error("Request access failed", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
