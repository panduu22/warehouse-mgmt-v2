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
    const userId = (session.user as any).id;

    try {
        const myAccess = await prisma.warehouseAccess.findMany({
            where: {
                userId: userId,
            },
            select: {
                warehouseId: true,
                status: true,
                role: true
            }
        });

        return NextResponse.json(myAccess ?? []);
    } catch (error) {
        console.error("Error fetching my access", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
