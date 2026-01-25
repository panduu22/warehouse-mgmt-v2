import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { requestId, status, role } = await req.json();
        const db = await getDb();

        const result = await db.collection("WarehouseAccess").findOneAndUpdate(
            { _id: new ObjectId(requestId) },
            {
                $set: {
                    status,
                    role: role || "STAFF",
                    updatedAt: new Date()
                }
            },
            { returnDocument: "after" }
        );

        if (!result) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...result,
            id: result._id.toString(),
            _id: undefined
        });
    } catch (error) {
        console.error("Approve failed", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
