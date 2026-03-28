import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import AccessRequest from "@/models/AccessRequest";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { warehouseId, requestedDuration } = await req.json();
        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        await dbConnect();

        // Check if there is already a pending request for this user and warehouse
        const existingRequest = await AccessRequest.findOne({
            userId: (session.user as any).id,
            warehouseId,
            status: "PENDING"
        });

        if (existingRequest) {
            return NextResponse.json({ error: "Request already pending" }, { status: 400 });
        }

        const request = new AccessRequest({
            userId: (session.user as any).id,
            warehouseId,
            requestedDuration: requestedDuration || 30, // Default 30 days
            status: "PENDING"
        });

        await request.save();
        return NextResponse.json(request, { status: 201 });
    } catch (error) {
        console.error("Error creating access request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = session.user as any;

    try {
        await dbConnect();
        
        let filter = {};
        if (user.role !== "ADMIN") {
            filter = { userId: user.id || user._id };
        }

        const requests = await AccessRequest.find(filter)
            .populate("userId", "name email image")
            .populate("warehouseId", "name location")
            .sort({ createdAt: -1 });

        return NextResponse.json(requests);
    } catch (error) {
        console.error("Error fetching access requests:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
