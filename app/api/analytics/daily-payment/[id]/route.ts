import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DailyPayment from "@/models/DailyPayment";
import mongoose from "mongoose";
import { requireWarehouseAccess } from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

// ─── Shared: resolve & authorize ────────────────────────────────────────────

async function authorize() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
    }

    // Only SUPER_ADMIN may mutate individual payment records.
    // We read the role from the verified server-side session — never from the request body.
    const role: string = (session.user as any)?.role ?? "STAFF";
    if (role !== "SUPER_ADMIN") {
        return {
            error: NextResponse.json(
                { error: "Forbidden: Only SUPER_ADMIN can edit or delete payment entries." },
                { status: 403 }
            ),
            session: null,
        };
    }

    return { error: null, session };
}

// ─── PATCH /api/analytics/daily-payment/[id] ────────────────────────────────

/**
 * PATCH /api/analytics/daily-payment/[id]
 * Body: { date?: string; amount?: number }
 *
 * Updates an existing DailyPayment record.
 * SUPER_ADMIN only — backend enforced.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error, session } = await authorize();
    if (error) return error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
    }

    let body: { date?: string; amount?: number };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { date, amount } = body;

    // Validation
    if (date !== undefined) {
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
        }
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
            return NextResponse.json({ error: "Invalid date value." }, { status: 400 });
        }
    }

    if (amount !== undefined) {
        if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
        }
    }

    if (date === undefined && amount === undefined) {
        return NextResponse.json({ error: "Provide at least one field to update: date or amount." }, { status: 400 });
    }

    try {
        await dbConnect();

        const update: Record<string, unknown> = {};
        if (date !== undefined) update.date = date;
        if (amount !== undefined) update.amount = Number(amount);

        const updated = await DailyPayment.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) {
            return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
        }

        // requireWarehouseAccess used for warehouse-scoping on the result
        const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
        if (denied) return denied;

        // Extra safety: SUPER_ADMIN passes without scoping, but if somehow not SA, block.
        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        return NextResponse.json({ success: true, record: updated });
    } catch (err) {
        console.error("daily-payment PATCH error:", err);
        return NextResponse.json({ error: "Failed to update payment record." }, { status: 500 });
    }
}

// ─── DELETE /api/analytics/daily-payment/[id] ───────────────────────────────

/**
 * DELETE /api/analytics/daily-payment/[id]
 *
 * Permanently removes a single DailyPayment record.
 * SUPER_ADMIN only — backend enforced.
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error, session } = await authorize();
    if (error) return error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
    }

    try {
        await dbConnect();

        // requireWarehouseAccess for warehouse-scoping sanity check
        const { denied, isSuperAdmin } = await requireWarehouseAccess(session);
        if (denied) return denied;
        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const deleted = await DailyPayment.findByIdAndDelete(id).lean();
        if (!deleted) {
            return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("daily-payment DELETE error:", err);
        return NextResponse.json({ error: "Failed to delete payment record." }, { status: 500 });
    }
}
