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
        const { returnedItems, status, verifiedAt, upiAmount, cashAmount } = await req.json(); // status should be "VERIFIED"

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

        // ── Return quantity validation ────────────────────────────────────────
        // Validate before touching any DB records so we fail cleanly on bad input.
        for (const item of returnedItems) {
            const tripItem = trip.loadedItems.find((i: any) => i.productId.toString() === item.productId);
            if (!tripItem) continue;

            const qtyReturned = Number(item.qtyReturned);
            if (isNaN(qtyReturned) || qtyReturned < 0) {
                return NextResponse.json({
                    error: `Invalid return quantity for product ${item.productId}: value must be 0 or greater.`
                }, { status: 400 });
            }

            // Scheme packs/bottles must also be non-negative
            for (const slab of (item.schemes || [])) {
                if (Number(slab.packs) < 0 || Number(slab.bottles) < 0) {
                    return NextResponse.json({
                        error: `Scheme quantities cannot be negative for product ${item.productId}.`
                    }, { status: 400 });
                }
            }

            const totalReturn = qtyReturned + (item.qtyScheme || 0);
            if (totalReturn > tripItem.qtyLoaded) {
                return NextResponse.json({
                    error: `Returned + Scheme (${totalReturn}) exceeds loaded quantity (${tripItem.qtyLoaded}) for product ${item.productId}.`
                }, { status: 400 });
            }
        }
        // ─────────────────────────────────────────────────────────────────────

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
                tripItem.schemes = item.schemes || [];

                // Deduct free items from stock
                for (const slab of (item.schemes || [])) {
                    for (const free of (slab.freeItems || [])) {
                        await Product.findByIdAndUpdate(free.productId, {
                            $inc: { quantity: -free.qty }
                        });
                    }
                }
            }
        }

        trip.status = "VERIFIED";

        // ── Payment validation ────────────────────────────────────────────────
        // Recompute grand total server-side from the DB data so the client
        // cannot send a spoofed receivedTotal.
        // This mirrors the frontend calculateSales() formula (normal + scheme sales).
        const populate = await trip.populate("loadedItems.productId");
        let serverGrandTotal = 0;
        for (const item of (populate as any).loadedItems) {
            const bpp = item.productId.bottlesPerPack;
            const packPrice = item.productId.price || item.productId.salePrice || 0;
            const loadedBottles = Math.round(Number(item.qtyLoaded || 0));
            // For items being verified right now, qtyReturned comes from returnedItems payload
            const retPayload = returnedItems.find((r: any) => r.productId === item.productId._id.toString());
            const returnedBottles = retPayload ? Number(retPayload.qtyReturned) : 0;
            const totalSoldBottles = loadedBottles - returnedBottles;

            let schemeBottles = 0;
            let schemeSalesValue = 0;
            const slabs: any[] = retPayload?.schemes || [];
            for (const s of slabs) {
                const sBottles = s.packs * bpp + s.bottles;
                schemeBottles += sBottles;
                const sPrice = packPrice - s.discountPerPack;
                schemeSalesValue += (s.packs * sPrice) + (s.bottles * (sPrice / bpp));
            }
            const normalBottles = totalSoldBottles - schemeBottles;
            const normalPacks = Math.floor(normalBottles / bpp);
            const normalRem   = normalBottles % bpp;
            serverGrandTotal += (normalPacks * packPrice) + (normalRem * (packPrice / bpp));
            serverGrandTotal += schemeSalesValue;
        }

        const safeUPI  = Math.max(0, Number(upiAmount)  || 0);
        const safeCash = Math.max(0, Number(cashAmount) || 0);
        const receivedTotal = safeUPI + safeCash;

        // Floating-point safe comparison (paise precision)
        if (Math.round(receivedTotal * 100) !== Math.round(serverGrandTotal * 100)) {
            return NextResponse.json({
                error: `Payment mismatch: received ₹${receivedTotal.toFixed(2)} but grand total is ₹${serverGrandTotal.toFixed(2)}`
            }, { status: 400 });
        }

        trip.upiAmount     = safeUPI;
        trip.cashAmount    = safeCash;
        trip.receivedTotal = receivedTotal;
        // ─────────────────────────────────────────────────────────────────────
        
        // Capture precise live tracking time in IST
        let finalEndTime = new Date();
        if (verifiedAt) {
            const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            // formatter output is "HH:MM:SS" (or 24h format)
            const timeParts = formatter.format(new Date()); 
            // In some environments, it returns "24:00:00" for midnight instead of "00", but it handles standard formatting
            const datePart = verifiedAt.split('T')[0];
            const isoString = `${datePart}T${timeParts}+05:30`;
            finalEndTime = new Date(isoString);
        }
        trip.endTime = finalEndTime;
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
