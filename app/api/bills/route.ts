import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { tripId, date } = await req.json();
        const db = await getDb();

        // Check if bill exists
        const existingBill = await db.collection("Bill").findOne({ tripId: new ObjectId(tripId) });
        if (existingBill) {
            return NextResponse.json({ error: "Bill already exists for this trip" }, { status: 400 });
        }

        const trip = await db.collection("Trip").findOne({ _id: new ObjectId(tripId) });

        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        if (trip.status !== "VERIFIED") {
            return NextResponse.json({ error: "Trip must be verified before billing" }, { status: 400 });
        }

        const itemIds = trip.loadedItems.map((i: any) => i.productId);
        const products = await db.collection("Product")
            .find({ _id: { $in: itemIds } })
            .toArray();

        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        let totalAmount = 0;

        trip.loadedItems.forEach((item: any) => {
            const sold = item.qtyLoaded - (item.qtyReturned || 0);
            const product = productMap.get(item.productId.toString());
            if (product && sold > 0) {
                totalAmount += sold * product.price;
            }
        });

        // Create Bill
        const newBillData = {
            tripId: new ObjectId(tripId),
            totalAmount,
            warehouseId: trip.warehouseId,
            generatedBy: new ObjectId((session.user as any).id),
            generatedAt: date ? new Date(date) : new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("Bill").insertOne(newBillData);

        return NextResponse.json({
            ...newBillData,
            id: result.insertedId.toString(),
            _id: undefined
        }, { status: 201 });

    } catch (error) {
        console.error("Bill generation error", error);
        return NextResponse.json({ error: "Failed to generate bill" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) return NextResponse.json([], { status: 400 });

    try {
        const db = await getDb();
        const warehouseObjectId = new ObjectId(warehouseId);

        // 1. Fetch Bills
        const bills = await db.collection("Bill")
            .find({ warehouseId: warehouseObjectId })
            .sort({ generatedAt: -1 })
            .toArray();

        // 2. Fetch Trips for these bills to enrich
        const tripIdsForBills = bills.map(b => b.tripId);
        const tripsForBills = await db.collection("Trip")
            .find({ _id: { $in: tripIdsForBills } })
            .toArray();

        // 3. Fetch Vehicles for those trips
        const vehicleIds = Array.from(new Set(tripsForBills.map(t => t.vehicleId)));
        const vehicles = await db.collection("Vehicle")
            .find({ _id: { $in: vehicleIds } })
            .toArray();

        const vehicleMap = new Map(vehicles.map(v => [v._id.toString(), v]));
        const tripMap = new Map(tripsForBills.map(t => [t._id.toString(), {
            ...t,
            id: t._id.toString(),
            vehicle: vehicleMap.get(t.vehicleId.toString()) ? {
                ...vehicleMap.get(t.vehicleId.toString()),
                id: t.vehicleId.toString()
            } : null
        }]));

        const enrichedBills = bills.map(b => ({
            ...b,
            id: b._id.toString(),
            _id: undefined,
            trip: tripMap.get(b.tripId.toString()) || null
        }));

        // 4. Fetch Pending Trips (Verified but no Bill)
        // Find all tripIds that already have bills
        const billedTripIds = await db.collection("Bill")
            .find({ warehouseId: warehouseObjectId })
            .project({ tripId: 1 })
            .toArray();
        const billedTripIdList = billedTripIds.map(b => b.tripId);

        const pendingTrips = await db.collection("Trip")
            .find({
                warehouseId: warehouseObjectId,
                status: "VERIFIED",
                _id: { $nin: billedTripIdList }
            })
            .sort({ endTime: -1 })
            .toArray();

        // Enrich pending trips with vehicle
        const pendingVehicleIds = Array.from(new Set(pendingTrips.map(t => t.vehicleId)));
        const pendingVehicles = await db.collection("Vehicle")
            .find({ _id: { $in: pendingVehicleIds } })
            .toArray();
        const pendingVehicleMap = new Map(pendingVehicles.map(v => [v._id.toString(), v]));

        const formattedPendingTrips = pendingTrips.map(t => ({
            ...t,
            id: t._id.toString(),
            _id: undefined,
            vehicle: pendingVehicleMap.get(t.vehicleId.toString()) ? {
                ...pendingVehicleMap.get(t.vehicleId.toString()),
                id: t.vehicleId.toString()
            } : null
        }));

        return NextResponse.json({
            bills: enrichedBills,
            pendingTrips: formattedPendingTrips
        });

    } catch (error) {
        console.error("Bill fetch error", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
