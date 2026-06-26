// app/api/auth/check-expiry/route.ts
// Internal-only endpoint called by middleware to check/prune expired warehouse access.
// Protected by the shared NEXTAUTH_SECRET so external callers are rejected.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { isoDateIST } from "@/lib/dateUtils";

export async function POST(req: Request) {
  // Verify the caller is the middleware (or another trusted server process).
  const incomingSecret = req.headers.get("x-internal-secret");
  if (!incomingSecret || incomingSecret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let email: string | undefined;
  try {
    const body = await req.json();
    email = body?.email as string | undefined;
  } catch {
    return NextResponse.json({ expired: false });
  }

  if (!email) return NextResponse.json({ expired: false });

  try {
    await dbConnect();
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ expired: false });

    const now = new Date();
    console.log("[CheckExpiry] IST now:", isoDateIST(now));
    console.log("[CheckExpiry] assignedWarehouses:", user.assignedWarehouses);

    type AssignedWarehouse = {
      warehouseId: mongoose.Types.ObjectId;
      expiresAt?: Date;
    };

    const allWarehouses: AssignedWarehouse[] = user.assignedWarehouses ?? [];

    const validWarehouses: AssignedWarehouse[] = allWarehouses.filter(
      (w) => !w.expiresAt || w.expiresAt > now
    );

    const hadExpired = allWarehouses.length !== validWarehouses.length;

    console.log("[CheckExpiry] Valid warehouses after filter:", validWarehouses);
    console.log("[CheckExpiry] Had expired?:", hadExpired);

    if (hadExpired) {
      user.assignedWarehouses = validWarehouses;

      // If the currently-active warehouse was one of the expired ones, clear it.
      if (
        user.activeWarehouseId != null &&
        !validWarehouses.some(
          (w) => w.warehouseId.toString() === user.activeWarehouseId?.toString()
        )
      ) {
        user.activeWarehouseId =
          validWarehouses.length > 0 ? validWarehouses[0].warehouseId : undefined;
      }

      await user.save();
      return NextResponse.json({ expired: true });
    }

    return NextResponse.json({ expired: false });
  } catch (e) {
    console.error("[CheckExpiry] DB error:", e);
    // Fail open — don't block the user if the DB check errors.
    return NextResponse.json({ expired: false });
  }
}
