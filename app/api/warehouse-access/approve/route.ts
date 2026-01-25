import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { requestId, status, role } = await req.json();
        const allowedStatuses = ["APPROVED", "REJECTED"];

        if (!allowedStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userRole = (session?.user as any)?.role;
        // Basic authorized check for now
        if (userRole !== "ADMIN") {
            // TODO: Add WAREHOUSE_ADMIN check via Prisma
        }

        const updatedAccess = await prisma.warehouseAccess.update({
            where: { id: requestId },
            data: {
                status,
                ...(role && { role })
            }
        });

        return NextResponse.json(updatedAccess);
    } catch (error) {
        console.error("Error updating access", error);
        if (error instanceof Error && error.message.includes("Record to update not found")) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
