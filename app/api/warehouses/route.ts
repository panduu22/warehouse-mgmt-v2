import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const role = user.role;
    const userId = user.id;

    try {
        let whereClause = {};

        if (role === "ADMIN") {
            // Admin sees all warehouses for management
            whereClause = {};
        } else {
            // Staff also sees all to request access
            whereClause = {};
        }

        const warehouses = await prisma.warehouse.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(warehouses);
    } catch (error) {
        console.error("Error fetching warehouses", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session?.user as any)?.role;

    // Only Global Admins can create warehouses? 
    // Or maybe we allow anyone to create for now as we transition?
    // Let's stick to ADMIN only check if possible, or allow all for dev.
    // Given previous User model has 'ADMIN', let's use that.

    if (!session || userRole !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    try {
        const { name, location } = await req.json();

        if (!name || !location) {
            return NextResponse.json({ error: "Name and location are required" }, { status: 400 });
        }

        const warehouse = await prisma.warehouse.create({
            data: {
                name,
                location,
                createdById: (session.user as any).id
            }
        });

        return NextResponse.json(warehouse, { status: 201 });
    } catch (error) {
        console.error("Error creating warehouse", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
