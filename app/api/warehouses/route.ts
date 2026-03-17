import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        await dbConnect();
        const warehouses = await Warehouse.find().sort({ createdAt: 1 });
        return NextResponse.json(warehouses);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // @ts-ignore
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { name, address, isMain } = await req.json();
        await dbConnect();

        const warehouse = await Warehouse.create({
            name,
            address,
            isMain: isMain || false,
            // @ts-ignore
            createdBy: session.user.id
        });

        return NextResponse.json(warehouse, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
    }
}
