import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import { requireWarehouseAccess, resolveWarehouseId } from "@/lib/warehouseAccess";

export const dynamic = "force-dynamic";

// ─── Timezone-safe helper ─────────────────────────────────────────────────────
// Always use the server's LOCAL date (IST) rather than UTC, so chart labels
// match the calendar day the user actually sees.
function toLocalDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const timeframe = url.searchParams.get("timeframe") || "daily";
        const weekOffset = parseInt(url.searchParams.get("weekOffset") || "0", 10);
        const selectedDate = url.searchParams.get("date"); // ISO date string YYYY-MM-DD

        // Get warehouse filter with RBAC
        const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
        if (denied) return denied;

        const cookieStore = await cookies();
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );

        const matchStage: any = {};
        if (warehouseId) {
            matchStage.warehouseId = new mongoose.Types.ObjectId(warehouseId);
        } else {
            return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
        }

        // Determine date range and grouping based on timeframe
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        let groupBy: any = {};

        // IST timezone string for MongoDB $dateToString so grouping uses local
        // calendar days instead of UTC days (fixes bills appearing on wrong bar)
        const TZ = "Asia/Kolkata";

        if (timeframe === "daily") {
            // Determine anchor date: use selectedDate param if provided, else today
            let anchorDate: Date;
            if (selectedDate) {
                // Parse YYYY-MM-DD as LOCAL date (not UTC)
                const [y, m, d] = selectedDate.split("-").map(Number);
                anchorDate = new Date(y, m - 1, d);
            } else {
                anchorDate = new Date(now);
            }

            // Find start of the week (Monday) containing anchorDate in LOCAL time
            const currentWeekStart = new Date(anchorDate);
            const dayOfWeek = currentWeekStart.getDay(); // 0=Sun … 6=Sat
            const diff = currentWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            currentWeekStart.setDate(diff);
            currentWeekStart.setHours(0, 0, 0, 0); // local midnight

            // Apply weekOffset relative to the anchor week
            startDate = new Date(currentWeekStart);
            startDate.setDate(startDate.getDate() - weekOffset * 7);

            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999); // local end-of-day

            matchStage.generatedAt = { $gte: startDate, $lte: endDate };

            // Group by LOCAL calendar day (IST) so the key matches our loop
            groupBy = {
                $dateToString: { format: "%Y-%m-%d", date: "$generatedAt", timezone: TZ },
            };
        } else if (timeframe === "weekly") {
            // Find start of current week (Monday) in LOCAL time
            const currentWeekStart = new Date(now);
            const dayOfWeek = currentWeekStart.getDay();
            const diff = currentWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            currentWeekStart.setDate(diff);
            currentWeekStart.setHours(0, 0, 0, 0);

            startDate = new Date(currentWeekStart);
            startDate.setDate(startDate.getDate() - 7 * 3); // 4 weeks total
            matchStage.generatedAt = { $gte: startDate };

            // Group by LOCAL calendar day, bucket into weeks below
            groupBy = {
                $dateToString: { format: "%Y-%m-%d", date: "$generatedAt", timezone: TZ },
            };
        } else if (timeframe === "monthly") {
            startDate.setDate(1);
            startDate.setMonth(now.getMonth() - 5); // last 6 months
            startDate.setHours(0, 0, 0, 0);
            matchStage.generatedAt = { $gte: startDate };

            // Group by LOCAL calendar month
            groupBy = {
                $dateToString: { format: "%Y-%m", date: "$generatedAt", timezone: TZ },
            };
        }

        const aggregation = [
            { $match: matchStage },
            {
                $group: {
                    _id: groupBy,
                    totalSales: { $sum: "$totalAmount" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 as 1 } },
        ];

        const results = await Bill.aggregate(aggregation);

        // Build chart data — use toLocalDateKey() so keys match MongoDB IST grouping
        const chartData: any[] = [];

        if (timeframe === "daily") {
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateKey = toLocalDateKey(d); // LOCAL date, not UTC
                const found = results.find((r) => r._id === dateKey);
                chartData.push({
                    period: d.toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Kolkata",
                    }),
                    fullDate: dateKey,
                    sales: found ? found.totalSales : 0,
                });
            }
        } else if (timeframe === "weekly") {
            for (let i = 0; i < 4; i++) {
                const weekStart = new Date(startDate);
                weekStart.setDate(startDate.getDate() + i * 7);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                if (weekStart > now) break;

                let weekSales = 0;
                for (
                    let d = new Date(weekStart);
                    d <= weekEnd;
                    d.setDate(d.getDate() + 1)
                ) {
                    const dateKey = toLocalDateKey(d); // LOCAL date, not UTC
                    const found = results.find((r) => r._id === dateKey);
                    if (found) weekSales += found.totalSales;
                }

                const startStr = weekStart.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    timeZone: "Asia/Kolkata",
                });
                const endStr = weekEnd.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    timeZone: "Asia/Kolkata",
                });

                chartData.push({
                    period: `${startStr} - ${endStr}`,
                    weekStart: toLocalDateKey(weekStart), // LOCAL date key
                    weekEnd: toLocalDateKey(weekEnd),     // LOCAL date key
                    sales: weekSales,
                });
            }
        } else if (timeframe === "monthly") {
            for (let i = 0; i < 6; i++) {
                const d = new Date(startDate);
                d.setMonth(startDate.getMonth() + i);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const found = results.find((r) => r._id === monthKey);
                chartData.push({
                    period: d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
                    monthKey,
                    sales: found ? found.totalSales : 0,
                });
            }
        }

        return NextResponse.json({ data: chartData });
    } catch (error) {
        console.error("Sales Analytics Error:", error);
        return NextResponse.json({ error: "Failed to fetch sales analytics" }, { status: 500 });
    }
}
