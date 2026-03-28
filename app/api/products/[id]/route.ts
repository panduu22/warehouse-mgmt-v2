import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = session.user as any;

        const { id } = await params;
        const { quantity, quantityToAdd, invoiceCost, price, mrp, salePrice } = await req.json();

        await dbConnect();

        const updateData: any = {};
        
        // Handle Quantity (Absolute or Incremental)
        if (quantity !== undefined) {
            updateData.quantity = quantity;
        } else if (quantityToAdd !== undefined) {
            updateData.$inc = { quantity: quantityToAdd };
        }

        // Handle Other Fields (Absolute)
        if (invoiceCost !== undefined) updateData.invoiceCost = invoiceCost;
        if (price !== undefined) updateData.price = price;
        if (mrp !== undefined) updateData.mrp = mrp;
        if (salePrice !== undefined) updateData.salePrice = salePrice;

        const product = await Product.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        await logActivity({
            userId: user.id || user._id,
            warehouseId: product.warehouseId.toString(),
            action: "EDIT_PRODUCT",
            details: `Updated product ${product.name} (SKU: ${product.sku}) quantities or pricing.`,
            targetId: product._id.toString(),
            targetModel: "Product",
        });

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = session.user as any;

        const { id } = await params;
        await dbConnect();

        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        await logActivity({
            userId: user.id || user._id,
            warehouseId: product.warehouseId.toString(),
            action: "DELETE_PRODUCT",
            details: `Deleted product ${product.name} (SKU: ${product.sku}).`,
            targetId: product._id.toString(),
            targetModel: "Product",
        });

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
