import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Bill from "@/models/Bill";
import Trip from "@/models/Trip";
import Restock from "@/models/Restock";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await dbConnect();
        const url = new URL(req.url);
        
        const warehouseIdStr = url.searchParams.get("warehouseId");
        const startDateStr = url.searchParams.get("startDate");
        const endDateStr = url.searchParams.get("endDate");
        const compareStartDateStr = url.searchParams.get("compareStartDate");
        const compareEndDateStr = url.searchParams.get("compareEndDate");

        // Admin check for "ALL" warehouses
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let warehouseFilter: any = {};
        if (warehouseIdStr && warehouseIdStr !== "ALL") {
            warehouseFilter.warehouseId = new mongoose.Types.ObjectId(warehouseIdStr);
        } else if (warehouseIdStr === "ALL") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((session.user as any).role !== "ADMIN") {
                return NextResponse.json({ error: "Unauthorized for all warehouses" }, { status: 403 });
            }
        }

        const now = new Date();
        const startDate = startDateStr ? new Date(startDateStr) : new Date(now.setHours(0,0,0,0));
        const endDate = endDateStr ? new Date(endDateStr) : new Date(now.setHours(23,59,59,999));

        const primaryDateFilter = { $gte: startDate, $lte: endDate };
        
        const compareEnabled = !!(compareStartDateStr && compareEndDateStr);
        const compareStartDate = compareEnabled ? new Date(compareStartDateStr!) : undefined;
        const compareEndDate = compareEnabled ? new Date(compareEndDateStr!) : undefined;
        
        const compareDateFilter = compareEnabled ? { $gte: compareStartDate, $lte: compareEndDate } : null;

        const [
            primaryBills, compareBills,
            primaryRestocks, compareRestocks,
            primaryTrips, compareTrips,
            currentActiveTrips, currentPendingVerifications,
            topProductsAgg, topVehiclesAgg, mostRestockedAgg, mostReturnedAgg,
            productsList,
            recentActivityTrips, recentActivityBills, recentActivityRestocks
        ] = await Promise.all([
            // Primary Bills (Sales)
            Bill.aggregate([
                { $match: { ...warehouseFilter, generatedAt: primaryDateFilter } },
                { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
            ]),
            // Compare Bills
            compareEnabled ? Bill.aggregate([
                { $match: { ...warehouseFilter, generatedAt: compareDateFilter } },
                { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
            ]) : Promise.resolve([]),
            
            // Primary Restocks
            Restock.countDocuments({ ...warehouseFilter, createdAt: primaryDateFilter }),
            // Compare Restocks
            compareEnabled ? Restock.countDocuments({ ...warehouseFilter, createdAt: compareDateFilter }) : Promise.resolve(0),
            
            // Primary Trips (Count)
            Trip.countDocuments({ ...warehouseFilter, createdAt: primaryDateFilter }),
            // Compare Trips (Count)
            compareEnabled ? Trip.countDocuments({ ...warehouseFilter, createdAt: compareDateFilter }) : Promise.resolve(0),
            
            // Live Status counts (Not date filtered, represents current snapshot)
            Trip.countDocuments({ ...warehouseFilter, status: "LOADED" }),
            Trip.countDocuments({ ...warehouseFilter, status: "RETURNED" }),

            // Top Products (By Sales Value in primary period)
            Bill.aggregate([
                { $match: { ...warehouseFilter, generatedAt: primaryDateFilter } },
                { $unwind: "$items" },
                { $group: { 
                    _id: "$items.name", 
                    pack: { $first: "$items.pack" }, 
                    flavour: { $first: "$items.flavour" }, 
                    totalSales: { $sum: "$items.total" }, 
                    totalQty: { $sum: "$items.normalQty" } 
                } },
                { $sort: { totalSales: -1 } },
                { $limit: 5 }
            ]),

            // Top Vehicles (By Sales Value generated in primary period)
            Bill.aggregate([
                { $match: { ...warehouseFilter, generatedAt: primaryDateFilter } },
                { $lookup: { from: "trips", localField: "tripId", foreignField: "_id", as: "trip" } },
                { $unwind: "$trip" },
                { $lookup: { from: "vehicles", localField: "trip.vehicleId", foreignField: "_id", as: "vehicle" } },
                { $unwind: "$vehicle" },
                { $group: { 
                    _id: "$vehicle._id", 
                    number: { $first: "$vehicle.number" }, 
                    driver: { $first: "$vehicle.driverName" }, 
                    totalSales: { $sum: "$totalAmount" },
                    tripCount: { $addToSet: "$trip._id" }
                } },
                { $project: { _id: 1, number: 1, driver: 1, totalSales: 1, tripCount: { $size: "$tripCount" } } },
                { $sort: { totalSales: -1 } },
                { $limit: 5 }
            ]),

            // Most Restocked
            Restock.aggregate([
                { $match: { ...warehouseFilter, createdAt: primaryDateFilter } },
                { $unwind: "$items" },
                { $group: {
                    _id: "$items.productId",
                    qtyAdded: { $sum: "$items.qtyAdded" }
                }},
                { $sort: { qtyAdded: -1 } },
                { $limit: 5 }
            ]),

            // Most Returned Products
            Trip.aggregate([
                { $match: { ...warehouseFilter, createdAt: primaryDateFilter, status: "VERIFIED" } },
                { $unwind: "$returnedItems" },
                { $group: {
                    _id: "$returnedItems.productId",
                    qtyReturned: { $sum: "$returnedItems.qtyReturned" }
                }},
                { $sort: { qtyReturned: -1 } },
                { $limit: 5 }
            ]),

            // Fetch products for stock value and low stock
            Product.find(warehouseFilter).lean(),

            // Recent Activity limited to Primary Date Filter
            Trip.find({ ...warehouseFilter, updatedAt: primaryDateFilter }).sort({ updatedAt: -1 }).limit(10).populate("vehicleId").lean(),
            Bill.find({ ...warehouseFilter, generatedAt: primaryDateFilter }).sort({ generatedAt: -1 }).limit(10).lean(),
            Restock.find({ ...warehouseFilter, createdAt: primaryDateFilter }).sort({ createdAt: -1 }).limit(10).lean()
        ]);

        // Process Products for names and stock snapshot
        let totalStockValue = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lowStockItems: any[] = [];
        const productMap = new Map();

        productsList.forEach(p => {
            productMap.set(p._id.toString(), { name: p.name, pack: p.pack, flavour: p.flavour });
            const qty = p.quantity || 0;
            const bpp = p.bottlesPerPack || 1;
            const price = p.price || p.salePrice || 0;
            totalStockValue += (qty * price) / bpp;
            
            if (qty < 20) {
                lowStockItems.push({
                    _id: p._id.toString(),
                    name: p.name,
                    pack: p.pack,
                    flavour: p.flavour,
                    quantity: qty,
                    bottlesPerPack: bpp
                });
            }
        });
        
        // Sort low stock by quantity (lowest first)
        lowStockItems.sort((a, b) => a.quantity - b.quantity).slice(0, 5);

        // Enhance Most Restocked and Most Returned with Product Names
        const enhancedMostRestocked = mostRestockedAgg.map(r => ({
            ...r,
            product: productMap.get(r._id.toString()) || { name: 'Unknown Product', pack: '', flavour: '' }
        }));

        const enhancedMostReturned = mostReturnedAgg.map(r => ({
            ...r,
            product: productMap.get(r._id.toString()) || { name: 'Unknown Product', pack: '', flavour: '' }
        }));

        // Combine Recent Activity
        const combinedActivity = [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...recentActivityTrips.map((t: any) => ({
                id: t._id.toString(), type: "TRIP", title: `Trip ${t.status}`, subtitle: `Vehicle: ${t.vehicleId?.number || 'Unknown'}`, status: t.status, date: t.updatedAt
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...recentActivityBills.map((b: any) => ({
                id: b._id.toString(), type: "BILL", title: `Invoice Generated`, subtitle: `₹${b.totalAmount.toLocaleString()}`, status: "COMPLETED", date: b.generatedAt
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...recentActivityRestocks.map((r: any) => ({
                id: r._id.toString(), type: "RESTOCK", title: `Stock Added`, subtitle: r.restockId || 'Manual Restock', status: "COMPLETED", date: r.createdAt
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        // Calculate KPI Growths
        const calculateGrowth = (current: number, previous: number) => {
            if (!compareEnabled) return undefined;
            if (previous === 0) return current > 0 ? 100 : 0;
            return Number((((current - previous) / previous) * 100).toFixed(1));
        };

        const primarySales = primaryBills[0]?.total || 0;
        const compareSales = compareBills[0]?.total || 0;
        
        const primaryInvoices = primaryBills[0]?.count || 0;
        const compareInvoices = compareBills[0]?.count || 0;

        return NextResponse.json({
            metrics: {
                sales: { current: primarySales, growth: calculateGrowth(primarySales, compareSales) },
                invoices: { current: primaryInvoices, growth: calculateGrowth(primaryInvoices, compareInvoices) },
                restocks: { current: primaryRestocks, growth: calculateGrowth(primaryRestocks, compareRestocks) },
                trips: { current: primaryTrips, growth: calculateGrowth(primaryTrips, compareTrips) },
                activeTrips: currentActiveTrips,
                pendingVerifications: currentPendingVerifications,
            },
            totalStockValue,
            lowStockItems: lowStockItems.slice(0, 5),
            topProducts: topProductsAgg,
            topVehicles: topVehiclesAgg,
            mostRestocked: enhancedMostRestocked,
            mostReturned: enhancedMostReturned,
            recentActivity: combinedActivity
        });

    } catch (error) {
        console.error("Dashboard Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
    }
}
