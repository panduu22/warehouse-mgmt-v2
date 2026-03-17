import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const { warehouseId } = await req.json();
        if (!warehouseId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        await dbConnect();
        const warehouse = await Warehouse.findById(warehouseId);
        if (!warehouse) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Update User Preference
        const session = await getServerSession(authOptions);
        if (session && session.user?.email) {
            await User.findOneAndUpdate(
                { email: session.user.email },
                { activeWarehouseId: warehouseId }
            );
        }

        // Set Cookies
        const cookieStore = await cookies();
        cookieStore.set("activeWarehouseId", warehouseId.toString(), { path: "/", maxAge: 60 * 60 * 24 * 30 }); // 30 days
        cookieStore.set("activeWarehouseName", warehouse.name, { path: "/", maxAge: 60 * 60 * 24 * 30 });

        return NextResponse.json({ 
            success: true, 
            activeWarehouseId: warehouse._id, 
            activeWarehouseName: warehouse.name 
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
