import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import AccessRequest from "@/models/AccessRequest";
import User from "@/models/User";
import { isoDateIST } from "@/lib/dateUtils";
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    // Ensure admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { status, adminNotes, durationDays } = await req.json();
        const { id: requestId } = await params;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        await dbConnect();
        const accessRequest = await AccessRequest.findById(requestId);
        if (!accessRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        accessRequest.status = status as any;
        accessRequest.adminNotes = adminNotes;
        await accessRequest.save();

        if (status === "APPROVED") {
            // Compute effective duration (days)
            const targetUser = await User.findById(accessRequest.userId);
            if (!targetUser) {
                return NextResponse.json({ error: "Target user not found" }, { status: 404 });
            }

            // Inside APPROVED block - compute duration and log
            const isTargetAdmin = targetUser.email === "rkagencies321@gmail.com";
            const effectiveDuration = durationDays ?? accessRequest.requestedDuration ?? 1; // default 1 day for testing

            const approvedAt = new Date();
            const expiresAt = new Date(approvedAt);
            expiresAt.setDate(expiresAt.getDate() + effectiveDuration);

            console.log("[AccessApproval] approvedAt (IST):", isoDateIST(approvedAt));
            console.log("[AccessApproval] expiresAt (IST):", isoDateIST(expiresAt));
            console.log("[AccessApproval] effectiveDuration days:", effectiveDuration);
            // Update the request record
            accessRequest.approvedAt = approvedAt;
            accessRequest.expiresAt = expiresAt;
            await accessRequest.save();

            // Update user permissions
            const user = targetUser;
            user.assignedWarehouses = user.assignedWarehouses || [];
            const existingIndex = user.assignedWarehouses.findIndex(
                (w: any) => w.warehouseId.toString() === accessRequest.warehouseId.toString()
            );
            if (existingIndex >= 0) {
                user.assignedWarehouses[existingIndex].expiresAt = expiresAt;
            } else {
                user.assignedWarehouses.push({
                    warehouseId: accessRequest.warehouseId,
                    expiresAt,
                });
            }
            // Always update activeWarehouseId to the newly approved warehouse.
            // Previously this only set it when it was null, which meant a user
            // whose access request was just approved would still land on whatever
            // old warehouse was stored (e.g. "Main Warehouse" from a prior session).
            user.activeWarehouseId = accessRequest.warehouseId;
            await user.save();
        }

        return NextResponse.json(accessRequest);
    } catch (error) {
        console.error("Error updating access request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { id: requestId } = await params;
        await dbConnect();

        const accessRequest = await AccessRequest.findById(requestId);
        if (!accessRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Only allow revoking APPROVED requests
        if (accessRequest.status !== "APPROVED") {
            return NextResponse.json({ error: "Only approved requests can be revoked" }, { status: 400 });
        }

        accessRequest.status = "REJECTED";
        accessRequest.adminNotes = "Access revoked by administrator.";
        await accessRequest.save();

        const user = await User.findById(accessRequest.userId);
        if (user) {
            // Remove from assigned warehouses
            if (user.assignedWarehouses) {
                user.assignedWarehouses = user.assignedWarehouses.filter(
                    (w: any) => w.warehouseId.toString() !== accessRequest.warehouseId.toString()
                );
            }

            // If it was the active warehouse, reset it
            if (user.activeWarehouseId && user.activeWarehouseId.toString() === accessRequest.warehouseId.toString()) {
                // Try to fallback to another assigned warehouse, otherwise null
                if (user.assignedWarehouses && user.assignedWarehouses.length > 0) {
                    user.activeWarehouseId = user.assignedWarehouses[0].warehouseId;
                } else {
                    user.activeWarehouseId = undefined;
                }
            }

            await user.save();
        }

        return NextResponse.json({ success: true, message: "Access revoked successfully" });
    } catch (error) {
        console.error("Error revoking access:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
