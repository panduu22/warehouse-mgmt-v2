import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const startDateParam = url.searchParams.get("startDate");
        const endDateParam = url.searchParams.get("endDate");

        if (!startDateParam || !endDateParam) {
            return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
        }

        // new Date("YYYY-MM-DD") is parsed as UTC midnight by spec.
        // We want LOCAL (IST) midnight so the window matches the calendar day.
        function parseLocalDate(str: string): Date {
            const [y, m, d] = str.split("-").map(Number);
            return new Date(y, m - 1, d); // Date(y, m, d) always uses local time
        }

        const startDate = parseLocalDate(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        const endDate = parseLocalDate(endDateParam);
        endDate.setHours(23, 59, 59, 999);

        // Get warehouse filter
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (main) warehouseId = main._id.toString();
            else warehouseId = undefined;
        }

        const matchStage: any = {
            generatedAt: { $gte: startDate, $lte: endDate },
        };
        if (warehouseId) {
            matchStage.warehouseId = new mongoose.Types.ObjectId(warehouseId);
        }

        // Aggregate to get total sales amount
        const totalResult = await Bill.aggregate([
            { $match: matchStage },
            { $group: { _id: null, totalSales: { $sum: "$totalAmount" }, billCount: { $sum: 1 } } },
        ]);

        const totalSales = totalResult[0]?.totalSales ?? 0;
        const billCount = totalResult[0]?.billCount ?? 0;

        // Unwind items and aggregate per product
        const productResult = await Bill.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $group: {
                    _id: {
                        name: "$items.name",
                        pack: "$items.pack",
                        flavour: "$items.flavour",
                        bottlesPerPack: "$items.bottlesPerPack",
                    },
                    totalBottles: { $sum: { $add: ["$items.normalQty", "$items.schemeQty"] } },
                    totalRevenue: { $sum: "$items.total" },
                },
            },
            { $sort: { totalRevenue: -1 } },
        ]);

        const products = productResult.map((p) => {
            const totalBottles = p.totalBottles;
            const bpp = p._id.bottlesPerPack || 1;
            const packs = Math.floor(totalBottles / bpp);
            const extraBottles = totalBottles % bpp;
            return {
                name: p._id.name,
                pack: p._id.pack,
                flavour: p._id.flavour,
                bottlesPerPack: bpp,
                totalBottles,
                packs,
                extraBottles,
                totalRevenue: p.totalRevenue,
            };
        });

        return NextResponse.json({
            totalSales,
            billCount,
            products,
        });
    } catch (error) {
        console.error("Sales Details Error:", error);
        return NextResponse.json({ error: "Failed to fetch sales details" }, { status: 500 });
    }
}
