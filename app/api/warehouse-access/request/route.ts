import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { warehouseId } = await req.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session.user as any).id;

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        const existingAccess = await prisma.warehouseAccess.findUnique({
            where: {
                userId_warehouseId: {
                    userId,
                    warehouseId
                }
            }
        });

        if (existingAccess) {
            return NextResponse.json({ error: "Access request already exists" }, { status: 409 });
        }

        const accessRequest = await prisma.warehouseAccess.create({
            data: {
                userId,
                warehouseId,
                role: "STAFF",
                status: "PENDING",
            }
        });

        return NextResponse.json(accessRequest, { status: 201 });
    } catch (error) {
        console.error("Error requesting access", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
