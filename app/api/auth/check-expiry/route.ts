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
  let cookieWarehouseId: string | undefined;
  let queryWarehouseId: string | undefined;
  let bodyWarehouseId: string | undefined;

  try {
    const body = await req.json();
    email = body?.email as string | undefined;
    cookieWarehouseId = body?.cookieWarehouseId as string | undefined;
    queryWarehouseId = body?.queryWarehouseId as string | undefined;
    bodyWarehouseId = body?.bodyWarehouseId as string | undefined;
  } catch {
    return NextResponse.json({ expired: false, authorized: true });
  }

  if (!email) return NextResponse.json({ expired: false, authorized: true });

  try {
    await dbConnect();
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return NextResponse.json({ expired: false, authorized: true });

    // Admins are authorized for everything
    if (user.role === "ADMIN") {
      return NextResponse.json({ expired: false, authorized: true });
    }

    const now = new Date();

    type AssignedWarehouse = {
      warehouseId: mongoose.Types.ObjectId;
      expiresAt?: Date;
    };

    const allWarehouses: AssignedWarehouse[] = user.assignedWarehouses ?? [];

    const validWarehouses: AssignedWarehouse[] = allWarehouses.filter(
      (w) => !w.expiresAt || w.expiresAt > now
    );

    const hadExpired = allWarehouses.length !== validWarehouses.length;

    if (hadExpired) {
      user.assignedWarehouses = validWarehouses;
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
    }

    // Get assigned warehouse ID from assignment record (enforcing same model/source of truth)
    const assignment = user.assignedWarehouses?.[0];
    const assignedWarehouseId = assignment
      ? (assignment.warehouseId?._id || assignment.warehouseId)
      : user.activeWarehouseId;

    if (!assignedWarehouseId) {
      return NextResponse.json({ expired: true, authorized: false });
    }

    const assignedWarehouseIdStr = String(assignedWarehouseId);

    const checkExplicitMismatch = (val?: string) => {
      if (!val || val === "undefined" || val === "null" || val.trim() === "") return false;
      return String(val) !== assignedWarehouseIdStr;
    };

    // If they explicitly requested a different warehouse in URL query or request body, return 403
    if (checkExplicitMismatch(queryWarehouseId) || checkExplicitMismatch(bodyWarehouseId)) {
      return NextResponse.json({ error: "You do not have access to this warehouse.", authorized: false }, { status: 403 });
    }

    // If the cookie is mismatched (outdated session), return correctWarehouseId to trigger auto-sync
    if (checkExplicitMismatch(cookieWarehouseId)) {
      return NextResponse.json({ expired: false, authorized: true, correctWarehouseId: assignedWarehouseIdStr });
    }

    return NextResponse.json({ expired: false, authorized: true });
  } catch (e) {
    console.error("[CheckExpiry] DB error:", e);
    return NextResponse.json({ expired: false, authorized: true });
  }
}
