import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "STAFF")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();

        const db = await getDb();

        // Prepare update data
        const updateData: any = { ...body };
        delete updateData.id;
        delete updateData._id;

        if (updateData.quantity !== undefined) updateData.quantity = Number(updateData.quantity);
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.invoiceCost !== undefined) updateData.invoiceCost = Number(updateData.invoiceCost);
        if (updateData.salePrice !== undefined) updateData.salePrice = Number(updateData.salePrice);

        updateData.updatedAt = new Date();

        const result = await db.collection("Product").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: "after" }
        );

        if (!result) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...result,
            id: result._id.toString(),
            _id: undefined
        });
    } catch (error) {
        console.error("Failed to update stock", error);
        return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
        }

        const { id } = await params;
        const db = await getDb();

        const result = await db.collection("Product").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Failed to delete product", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
