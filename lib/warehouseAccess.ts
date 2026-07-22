/**
 * lib/warehouseAccess.ts
 *
 * Centralized RBAC helper for every warehouse-scoped API route.
 *
 * Rules:
 *  - SUPER_ADMIN        → unrestricted; may access any warehouse
 *  - WAREHOUSE_ADMIN    → only assigned warehouses (same as STAFF)
 *  - STAFF              → only assigned warehouses
 *
 * Usage in a route handler:
 *
 *   import { requireWarehouseAccess, resolveWarehouseId } from "@/lib/warehouseAccess";
 *
 *   const { denied, assignedWarehouseIds, isSuperAdmin } =
 *       await requireWarehouseAccess(session);
 *   if (denied) return denied;   // already a 403 NextResponse
 *
 *   // Get the active warehouse for cookie-based queries:
 *   const warehouseId = await resolveWarehouseId(cookieWarehouseId, isSuperAdmin, assignedWarehouseIds);
 *   if (!warehouseId) return NextResponse.json({ error: "No warehouse context" }, { status: 400 });
 *
 *   // For param-based queries (e.g. ?warehouseId=…), validate before querying:
 *   const guard = guardWarehouseParam(requestedId, isSuperAdmin, assignedWarehouseIds);
 *   if (guard) return guard;   // 403 if not authorized
 */

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WarehouseAccessResult {
    /** Non-null when the user is NOT authorized. Return this directly from the route. */
    denied: NextResponse | null;
    /** True only for SUPER_ADMIN */
    isSuperAdmin: boolean;
    /** MongoDB ObjectId strings of all valid (non-expired) assigned warehouses.
     *  Empty array for SUPER_ADMIN (they bypass all warehouse checks). */
    assignedWarehouseIds: string[];
}

// ─── Core guard ────────────────────────────────────────────────────────────

/**
 * requireWarehouseAccess
 *
 * Call this at the top of every warehouse-scoped route handler, passing the
 * full next-auth `session` object (already fetched via getServerSession).
 *
 * Returns { denied, isSuperAdmin, assignedWarehouseIds }.
 * - If `denied` is non-null, return it immediately (it's a 403 response).
 * - If `denied` is null, the user is authorized; proceed with your logic.
 */
export async function requireWarehouseAccess(
    session: any
): Promise<WarehouseAccessResult> {
    // Must be authenticated
    if (!session?.user?.email) {
        return {
            denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
            isSuperAdmin: false,
            assignedWarehouseIds: [],
        };
    }

    const role: string = session.user.role ?? "STAFF";

    // SUPER_ADMIN → unrestricted
    if (role === "SUPER_ADMIN") {
        return { denied: null, isSuperAdmin: true, assignedWarehouseIds: [] };
    }

    // WAREHOUSE_ADMIN or STAFF → query DB for current assigned warehouses
    await dbConnect();
    const now = new Date();

    const dbUser = await User.findOne({
        email: session.user.email.trim().toLowerCase(),
    })
        .select("assignedWarehouses role")
        .lean() as any;

    if (!dbUser) {
        return {
            denied: NextResponse.json({ error: "User not found" }, { status: 403 }),
            isSuperAdmin: false,
            assignedWarehouseIds: [],
        };
    }

    const valid: string[] = ((dbUser.assignedWarehouses ?? []) as any[])
        .filter((w: any) => !w.expiresAt || new Date(w.expiresAt) > now)
        .map((w: any) => (w.warehouseId?._id ?? w.warehouseId).toString());

    if (valid.length === 0) {
        // No valid warehouse assignments — treat as forbidden
        return {
            denied: NextResponse.json(
                { error: "You are not assigned to any warehouse." },
                { status: 403 }
            ),
            isSuperAdmin: false,
            assignedWarehouseIds: [],
        };
    }

    return { denied: null, isSuperAdmin: false, assignedWarehouseIds: valid };
}

// ─── Warehouse-param guard ──────────────────────────────────────────────────

/**
 * guardWarehouseParam
 *
 * Use when the requested warehouse comes from a URL param or request body
 * (e.g. ?warehouseId=xxx or { warehouseId: xxx }).
 *
 * Returns a 403 NextResponse if the user is not authorized to access that
 * specific warehouse, or null if access is permitted.
 */
export function guardWarehouseParam(
    requestedWarehouseId: string | null | undefined,
    isSuperAdmin: boolean,
    assignedWarehouseIds: string[]
): NextResponse | null {
    if (isSuperAdmin) return null; // unrestricted

    if (!requestedWarehouseId) return null; // absent param — resolveWarehouseId handles this

    if (!assignedWarehouseIds.includes(requestedWarehouseId)) {
        return NextResponse.json(
            { error: "You do not have access to this warehouse." },
            { status: 403 }
        );
    }
    return null;
}

// ─── Cookie-based warehouse resolution ─────────────────────────────────────

/**
 * resolveWarehouseId
 *
 * Resolves the "active" warehouse ID for cookie-based routes (those that read
 * the activeWarehouseId cookie rather than a URL param).
 *
 * - SUPER_ADMIN: uses the cookie value as-is; falls back to main warehouse.
 * - Others: ignores the cookie if it points to an unassigned warehouse and
 *   returns the first assigned warehouse instead. Never falls back to the
 *   global main warehouse for non-super-admins.
 *
 * Returns the resolved warehouse ID string, or null if it cannot be determined.
 */
export async function resolveWarehouseId(
    cookieWarehouseId: string | undefined,
    isSuperAdmin: boolean,
    assignedWarehouseIds: string[]
): Promise<string | null> {
    if (isSuperAdmin) {
        // Use cookie if valid, else fall back to global main warehouse
        if (cookieWarehouseId && mongoose.Types.ObjectId.isValid(cookieWarehouseId)) {
            return cookieWarehouseId;
        }
        await dbConnect();
        const main = await Warehouse.findOne({ isMain: true }).lean() as any;
        return main ? main._id.toString() : null;
    }

    // Non-super-admin: never touch unassigned warehouses
    if (
        cookieWarehouseId &&
        mongoose.Types.ObjectId.isValid(cookieWarehouseId) &&
        assignedWarehouseIds.includes(cookieWarehouseId)
    ) {
        return cookieWarehouseId;
    }

    // Cookie missing or wrong → use first assigned warehouse
    return assignedWarehouseIds[0] ?? null;
}

// ─── Capability flags (for /api/warehouses response) ───────────────────────

export interface WarehouseCapabilities {
    canSwitchWarehouse: boolean;
    canCreateWarehouse: boolean;
    canManageWarehouses: boolean;
    isSingleWarehouseUser: boolean;
}

export function computeCapabilities(
    isSuperAdmin: boolean,
    assignedWarehouseIds: string[]
): WarehouseCapabilities {
    if (isSuperAdmin) {
        return {
            canSwitchWarehouse: true,
            canCreateWarehouse: true,
            canManageWarehouses: true,
            isSingleWarehouseUser: false,
        };
    }
    return {
        canSwitchWarehouse: assignedWarehouseIds.length > 1,
        canCreateWarehouse: false,
        canManageWarehouses: false,
        isSingleWarehouseUser: assignedWarehouseIds.length === 1,
    };
}
