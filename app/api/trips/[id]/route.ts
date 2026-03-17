import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Trip from "@/models/Trip";
import Product from "@/models/Product";
import Vehicle from "@/models/Vehicle";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    // Only ADMIN should verify? "ADMIN: Verify trips". Yes.
    // STAFF: Update returned stock?
    // Flow: "Vehicle Return & Verification... Status: RETURNED -> VERIFIED".
    // Let's assume ADMIN does the final verification button.
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Strict to admin for verification
    if ((session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Only Admins can verify trips" }, { status: 403 });
    }

    try {
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

        // specific logic for returnedItems: [{ productId, qtyReturned }]
        // We need to update trip loadedItems with returned quantities or just store returnedItems separately?
        // Trip Model has `returnedItems: [{ productId, qtyReturned }]`? 
        // Wait, my Trip Model definition had `loadedItems: [ { productId, qtyLoaded, qtyReturned } ]` ?
        // Let's check Trip.ts ... 
        // it had `TripItemSchema` with `qtyReturned`.
        // So I will update the `loadedItems` array with `qtyReturned` values.

        // Update stock for returned items
        for (const item of returnedItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { quantity: item.qtyReturned }
            });

            // Update trip item
            const tripItem = trip.loadedItems.find((i: any) => i.productId.toString() === item.productId);
            if (tripItem) {
                tripItem.qtyReturned = item.qtyReturned;
            }
        }

        trip.status = "VERIFIED";
        trip.endTime = verifiedAt ? new Date(verifiedAt) : new Date();
        trip.verifiedBy = (session.user as any).id;
        await trip.save();

        // Release Vehicle
        await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "AVAILABLE" });

        return NextResponse.json(trip);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
