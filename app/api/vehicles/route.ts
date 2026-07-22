import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import {
    requireWarehouseAccess,
    resolveWarehouseId,
} from "@/lib/warehouseAccess";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── RBAC ──────────────────────────────────────────────────────────────
    const { denied, isSuperAdmin, assignedWarehouseIds } =
        await requireWarehouseAccess(session);
    if (denied) return denied;

    try {
        const { number, driverName } = await req.json();
        await dbConnect();

        const cookieStore = await cookies();
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );
        if (!warehouseId) {
            return NextResponse.json(
                { error: "No warehouse context found" },
                { status: 400 }
            );
        }

        const vehicle = await Vehicle.create({ number, driverName, warehouseId });
        return NextResponse.json(vehicle, { status: 201 });
    } catch (error: any) {
        console.error("Vehicle Creation Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create vehicle" },
            { status: 500 }
        );
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── RBAC ──────────────────────────────────────────────────────────────
    const { denied, isSuperAdmin, assignedWarehouseIds } =
        await requireWarehouseAccess(session);
    if (denied) return denied;

    try {
        const [, cookieStore] = await Promise.all([dbConnect(), cookies()]);
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );

        const filter = warehouseId ? { warehouseId } : {};
        const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 }).lean();
        return NextResponse.json(vehicles);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch vehicles" },
            { status: 500 }
        );
    }
}
