import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
        }

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

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();

        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
