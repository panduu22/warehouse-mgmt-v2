import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Unauthorized: Super Admins only" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const conn = await dbConnect();
        const db = conn.connection.db;
        if (!db) throw new Error("DB not initialized");
        const warehouseId = new ObjectId(id);

        // Delete warehouse
        const result = await db.collection("Warehouse").deleteOne({ _id: warehouseId });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        // Optionally, delete all associated products, vehicles, trips, bills, etc., or leave them.
        // For now let's just delete the products to save space and avoid orphans.
        await db.collection("Product").deleteMany({ warehouseId });
        await db.collection("Vehicle").deleteMany({ warehouseId });
        await db.collection("Trip").deleteMany({ warehouseId });
        await db.collection("Bill").deleteMany({ warehouseId });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error deleting warehouse", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
