import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";
import Trip from "@/models/Trip";
import Product from "@/models/Product";
// Need Product to get price history? 
// Current Price or Historical Price? 
// Product model has current price. Trip doesn't store price snapshot.
// For accuracy, Trip should store priceAtLoad, but for MVP I'll use current Product price.
// Or fetch current price from Product model during calculation.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { tripId, date } = await req.json();
        await dbConnect();

        // Check if bill exists
        const existingBill = await Bill.findOne({ tripId });
        if (existingBill) {
            return NextResponse.json({ error: "Bill already exists for this trip" }, { status: 400 });
        }

        const trip = await Trip.findById(tripId).populate("loadedItems.productId");
        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

        if (trip.status !== "VERIFIED") {
            return NextResponse.json({ error: "Trip must be verified before billing" }, { status: 400 });
        }

        // Calculate Total
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let totalAmount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trip.loadedItems.forEach((item: any) => {
            const sold = item.qtyLoaded - (item.qtyReturned || 0);
            const price = item.productId.price;
            if (sold > 0) {
                totalAmount += sold * price;
            }
        });

        const bill = await Bill.create({
            tripId,
            totalAmount,
            generatedBy: (session.user as any).id,
            generatedAt: date ? new Date(date) : new Date()
        });

        return NextResponse.json(bill, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to generate bill" }, { status: 500 });
    }
}

export async function GET() {
    await dbConnect();
    // Get all bills
    // And also we might want a way to get "Verified but unbilled trips".
    // separate endpoint? Or just filter on client? 
    // I'll return Bills here.
    const bills = await Bill.find({})
        .populate({
            path: "tripId",
            populate: { path: "vehicleId" }
        })
        .sort({ generatedAt: -1 });
    return NextResponse.json(bills);
}
