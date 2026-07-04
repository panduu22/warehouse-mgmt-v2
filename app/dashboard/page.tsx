import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Trip from "@/models/Trip";
import Bill from "@/models/Bill";
import Restock from "@/models/Restock";
import Warehouse from "@/models/Warehouse";
import Vehicle from "@/models/Vehicle"; // Ensure populated
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { DashboardClient } from "./DashboardClient";

async function getData(warehouseIdStr?: string) {
    await dbConnect();

    let warehouseId = warehouseIdStr;
    let warehouseName = "Main Warehouse";
    
    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
        const main = await Warehouse.findOne({ isMain: true }).lean();
        if (main) {
            warehouseId = main._id.toString();
            warehouseName = main.name;
        } else {
            warehouseId = undefined;
        }
    } else {
        const wh = await Warehouse.findById(warehouseId).lean();
        if (wh) warehouseName = wh.name;
    }
    
    const filter = warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {};

    // 1. Total Stock Value & Low Stock List
    const products = await Product.find(filter).lean();
    let totalValue = 0;
    const lowStockItems: any[] = [];
    const productMap = new Map();

    products.forEach(p => {
        productMap.set(p._id.toString(), { name: p.name, pack: p.pack, flavour: p.flavour });
        const qty = p.quantity || 0;
        const bpp = p.bottlesPerPack || 1;
        const price = p.price || p.salePrice || 0;
        
        totalValue += (qty * price) / bpp;
        
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

    lowStockItems.sort((a, b) => a.quantity - b.quantity);

    // 2. Date ranges for comparisons (Today / Yesterday)
    const now = new Date();
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // 3. Parallel fetching
    const [
        todayBills, yesterdayBills,
        todayRestocks, yesterdayRestocks,
        todayTrips, yesterdayTrips,
        activeTrips, pendingVerifications,
        topProductsAgg, topVehiclesAgg, mostRestockedAgg, mostReturnedAgg,
        recentActivityTrips, recentActivityBills, recentActivityRestocks
    ] = await Promise.all([
        // Bills (Sales)
        Bill.aggregate([
            { $match: { ...filter, generatedAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
        ]),
        Bill.aggregate([
            { $match: { ...filter, generatedAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
        ]),
        
        // Restocks
        Restock.countDocuments({ ...filter, createdAt: { $gte: todayStart, $lte: todayEnd } }),
        Restock.countDocuments({ ...filter, createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
        
        // Trips (Count)
        Trip.countDocuments({ ...filter, createdAt: { $gte: todayStart, $lte: todayEnd } }),
        Trip.countDocuments({ ...filter, createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
        
        // Trips metrics (Current state snapshots)
        Trip.countDocuments({ ...filter, status: "LOADED" }),
        Trip.countDocuments({ ...filter, status: "RETURNED" }),

        // Top Products
        Bill.aggregate([
            { $match: { ...filter, generatedAt: { $gte: todayStart, $lte: todayEnd } } },
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

        // Top Vehicles
        Bill.aggregate([
            { $match: { ...filter, generatedAt: { $gte: todayStart, $lte: todayEnd } } },
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
            { $match: { ...filter, createdAt: { $gte: todayStart, $lte: todayEnd } } },
            { $unwind: "$items" },
            { $group: {
                _id: "$items.productId",
                qtyAdded: { $sum: "$items.qtyAdded" }
            }},
            { $sort: { qtyAdded: -1 } },
            { $limit: 5 }
        ]),

        // Most Returned
        Trip.aggregate([
            { $match: { ...filter, createdAt: { $gte: todayStart, $lte: todayEnd }, status: "VERIFIED" } },
            { $unwind: "$returnedItems" },
            { $group: {
                _id: "$returnedItems.productId",
                qtyReturned: { $sum: "$returnedItems.qtyReturned" }
            }},
            { $sort: { qtyReturned: -1 } },
            { $limit: 5 }
        ]),

        // Recent Activity
        Trip.find({ ...filter, updatedAt: { $gte: todayStart, $lte: todayEnd } }).sort({ updatedAt: -1 }).limit(10).populate("vehicleId").lean(),
        Bill.find({ ...filter, generatedAt: { $gte: todayStart, $lte: todayEnd } }).sort({ generatedAt: -1 }).limit(10).lean(),
        Restock.find({ ...filter, createdAt: { $gte: todayStart, $lte: todayEnd } }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    // Process Sales & Invoices
    const todaySales = todayBills[0]?.total || 0;
    const todayInvoices = todayBills[0]?.count || 0;
    const yesterdaySales = yesterdayBills[0]?.total || 0;
    const yesterdayInvoices = yesterdayBills[0]?.count || 0;
    
    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // Enhance Most Restocked and Most Returned
    const enhancedMostRestocked = mostRestockedAgg.map(r => ({
        ...r,
        product: productMap.get(r._id.toString()) || { name: 'Unknown Product', pack: '', flavour: '' }
    }));

    const enhancedMostReturned = mostReturnedAgg.map(r => ({
        ...r,
        product: productMap.get(r._id.toString()) || { name: 'Unknown Product', pack: '', flavour: '' }
    }));

    // Prepare Activity Timeline
    const combinedActivity = [
        ...recentActivityTrips.map((t: any) => ({
            id: t._id.toString(),
            type: "TRIP",
            title: `Trip ${t.status}`,
            subtitle: `Vehicle: ${t.vehicleId?.number || 'Unknown'}`,
            status: t.status,
            date: t.updatedAt
        })),
        ...recentActivityBills.map((b: any) => ({
            id: b._id.toString(),
            type: "BILL",
            title: `Invoice Generated`,
            subtitle: `₹${b.totalAmount.toLocaleString()}`,
            status: "COMPLETED",
            date: b.generatedAt
        })),
        ...recentActivityRestocks.map((r: any) => ({
            id: r._id.toString(),
            type: "RESTOCK",
            title: `Stock Added`,
            subtitle: r.restockId || 'Manual Restock',
            status: "COMPLETED",
            date: r.createdAt
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return {
        warehouseId: warehouseId || "ALL",
        warehouseName,
        totalStockValue: totalValue,
        lowStockItems: lowStockItems.slice(0, 5),
        metrics: {
            sales: { current: todaySales, growth: calculateGrowth(todaySales, yesterdaySales) },
            invoices: { current: todayInvoices, growth: calculateGrowth(todayInvoices, yesterdayInvoices) },
            restocks: { current: todayRestocks, growth: calculateGrowth(todayRestocks, yesterdayRestocks) },
            trips: { current: todayTrips, growth: calculateGrowth(todayTrips, yesterdayTrips) },
            activeTrips,
            pendingVerifications,
        },
        topProducts: topProductsAgg,
        topVehicles: topVehiclesAgg,
        mostRestocked: enhancedMostRestocked,
        mostReturned: enhancedMostReturned,
        recentActivity: combinedActivity
    };
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/api/auth/signin");
    }

    const cookieStore = await cookies();
    const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

    const initialData = await getData(cookieWarehouseId);
    const user = session.user as any;

    let warehouses: any[] = [];
    if (user.role === "ADMIN") {
        warehouses = await Warehouse.find().select("name").lean();
        warehouses = [{ _id: "ALL", name: "All Warehouses" }, ...warehouses];
    } else {
        const wh = await Warehouse.findById(cookieWarehouseId || initialData.warehouseId).select("name").lean();
        if (wh) {
            warehouses = [wh];
        }
    }

    // Convert ObjectIds to strings to prevent serialization errors
    const serializedInitialData = JSON.parse(JSON.stringify(initialData));
    const serializedWarehouses = JSON.parse(JSON.stringify(warehouses));

    return (
        <DashboardClient 
            initialData={serializedInitialData} 
            user={user} 
            warehouses={serializedWarehouses}
        />
    );
}
