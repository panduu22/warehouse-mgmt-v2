import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import Product from "@/models/Product";
import Vehicle from "@/models/Vehicle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const { returnedItems, status, verifiedAt } = await req.json(); // status should be "VERIFIED"

        // Only handling VERIFIED for now as per flow
        if (status !== "VERIFIED") {
            return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
        }

        await dbConnect();
        const trip = await Trip.findById(id);
        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

        if (trip.status === "VERIFIED") {
            return NextResponse.json({ error: "Trip already verified" }, { status: 400 });
        }

        // specific logic for returnedItems: [{ productId, qtyReturned, qtyScheme, discountPerPack }]
        for (const item of returnedItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: item.qtyReturned }
            });
 
            // Update trip item
            const tripItem = trip.loadedItems.find((i: any) => i.productId.toString() === item.productId);
            if (tripItem) {
                tripItem.qtyReturned = item.qtyReturned;
                tripItem.qtyScheme = item.qtyScheme || 0;
                tripItem.discountPerPack = item.discountPerPack || 0;
                tripItem.schemes = item.schemes || []; // New field
            }
        }

        trip.status = "VERIFIED";
        trip.endTime = verifiedAt ? new Date(verifiedAt) : new Date();
        trip.verifiedBy = (session.user as any).id || (session.user as any)._id;
        await trip.save();

        // Release Vehicle
        await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "AVAILABLE" });

        await logActivity({
            userId: (session.user as any).id || (session.user as any)._id,
            warehouseId: trip.warehouseId.toString(),
            action: "VERIFY_TRIP",
            details: `Unloaded and verified vehicle return.`,
            targetId: trip._id.toString(),
            targetModel: "Trip",
        });

        return NextResponse.json(trip);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
