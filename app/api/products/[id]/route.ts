import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { checkWarehouseAccess } from "@/lib/access";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const db = await getDb();
        const user = session.user as any;

        // Fetch product to get warehouseId
        const product = await db.collection("Product").findOne({ _id: new ObjectId(id) });
        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const hasAccess = await checkWarehouseAccess(user.id, user.role, product.warehouseId.toString());
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }

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
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const db = await getDb();
        const user = session.user as any;

        // Fetch product to get warehouseId
        const product = await db.collection("Product").findOne({ _id: new ObjectId(id) });
        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const hasAccess = await checkWarehouseAccess(user.id, user.role, product.warehouseId.toString());
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }

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
