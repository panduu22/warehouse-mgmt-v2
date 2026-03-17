import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
export const dynamic = "force-dynamic";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        await dbConnect();
        
        // 1. Check cookies first for quick lookup
        const cookieStore = await cookies();
        const activeWarehouseId = cookieStore.get("activeWarehouseId")?.value;
        const activeWarehouseName = cookieStore.get("activeWarehouseName")?.value;

        if (activeWarehouseId) {
            return NextResponse.json({ activeWarehouseId, activeWarehouseName });
        }

        // 2. If no cookie, check User record
        const session = await getServerSession(authOptions);
        if (session && session.user?.email) {
            const user = await User.findOne({ email: session.user.email }).populate("activeWarehouseId");
            if (user?.activeWarehouseId) {
                // Set cookie for future
                // @ts-ignore
                cookieStore.set("activeWarehouseId", user.activeWarehouseId._id.toString());
                // @ts-ignore
                cookieStore.set("activeWarehouseName", user.activeWarehouseId.name);
                
                return NextResponse.json({ 
                    // @ts-ignore
                    activeWarehouseId: user.activeWarehouseId._id, 
                    // @ts-ignore
                    activeWarehouseName: user.activeWarehouseId.name 
                });
            }
        }

        // 3. If no user preference, return Main Warehouse
        const mainWarehouse = await Warehouse.findOne({ isMain: true });
        if (mainWarehouse) {
            return NextResponse.json({ 
                activeWarehouseId: mainWarehouse._id, 
                activeWarehouseName: mainWarehouse.name 
            });
        }

        // 4. If absolutely nothing found
        return NextResponse.json({ activeWarehouseId: null, activeWarehouseName: "No Warehouse" });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ activeWarehouseId: null, activeWarehouseName: "Error" });
    }
}
