import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "STAFF")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Strict consistency check: Only Admin can edit price/product details? Staff might only add stock (which is usually POST or specific endpoint)
        // For general "Edit Stock", assume ID based update is Admin or Staff allowed for now based on prompt context (Staff loads vehicles, Admin manages stock)
        // The prompt says "stock mgmt put add button and items should be editable". Usually Admin edit.
        // Let's keep it safe.

        const { id } = await params;
        const body = await req.json();

        // Prisma update
        const product = await prisma.product.update({
            where: { id },
            data: {
                ...body,
                quantity: body.quantity !== undefined ? Number(body.quantity) : undefined,
                price: body.price !== undefined ? Number(body.price) : undefined,
                invoiceCost: body.invoiceCost !== undefined ? Number(body.invoiceCost) : undefined
            }
        });

        return NextResponse.json(product);
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

        await prisma.product.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Failed to delete product", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
