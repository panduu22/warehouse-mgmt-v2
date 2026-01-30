import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { Package, Truck, Receipt, MoreHorizontal, ArrowRight, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import DashboardDateFilter from "@/components/DashboardDateFilter";
import LiveClock from "@/components/LiveClock";
import { ObjectId } from "mongodb";

import { cookies } from "next/headers";

async function getData(warehouseId: string, dateFilter?: string) {
    const db = await getDb();
    const wId = new ObjectId(warehouseId);

    const dateQuery = dateFilter ? {
        $gte: new Date(dateFilter),
        $lt: new Date(new Date(dateFilter).getTime() + 24 * 60 * 60 * 1000)
    } : undefined;

    // Build Queries - ALL Scoped by WarehouseId
    const baseQuery = { warehouseId: wId };

    const tripQuery: any = {
        warehouseId: wId,
        ...(dateFilter ? { startTime: dateQuery } : { status: { $ne: "VERIFIED" } })
    };

    const verifiedTripsQuery: any = {
        warehouseId: wId,
        status: "VERIFIED",
        ...(dateFilter ? { endTime: dateQuery } : {})
    };

    const billQuery: any = {
        warehouseId: wId,
        ...(dateFilter ? { generatedAt: dateQuery } : {})
    };

    const activityQuery: any = {
        warehouseId: wId,
        ...(dateFilter ? { updatedAt: dateQuery } : {})
    };

    const lowStockQuery: any = {
        warehouseId: wId,
        quantity: { $lt: 20 }
    };

    const [productStock, tripMetricCount, verifiedTripsCount, billCount, lowStockCount, recentTrips, warehouse] = await Promise.all([
        db.collection("Product").aggregate([
            { $match: baseQuery },
            { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]).toArray(),
        db.collection("Trip").countDocuments(tripQuery),
        db.collection("Trip").countDocuments(verifiedTripsQuery),
        db.collection("Bill").countDocuments(billQuery),
        db.collection("Product").countDocuments(lowStockQuery),
        db.collection("Trip")
            .find(activityQuery)
            .sort({ updatedAt: -1 })
            .limit(dateFilter ? 50 : 5)
            .toArray(),
        db.collection("Warehouse").findOne({ _id: wId })
    ]);

    // Enrich recent trips with vehicle
    const vehicleIds = Array.from(new Set(recentTrips.map(t => t.vehicleId)));
    const vehicles = await db.collection("Vehicle").find({ _id: { $in: vehicleIds } }).toArray();
    const vehicleMap = new Map(vehicles.map(v => [v._id.toString(), v]));

    const formattedRecentTrips = recentTrips.map(t => ({
        ...t,
        id: t._id.toString(),
        _id: undefined,
        vehicle: vehicleMap.get(t.vehicleId.toString()) ? {
            ...vehicleMap.get(t.vehicleId.toString()),
            id: t.vehicleId.toString()
        } : null
    }));

    return {
        warehouseName: warehouse?.name || "Warehouse",
        productCount: productStock[0]?.total || 0,
        tripMetricCount,
        verifiedTripsCount,
        billCount,
        lowStockCount,
        recentTrips: formattedRecentTrips || [],
        isFiltered: !!dateFilter
    };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const warehouseId = cookieStore.get("warehouseId")?.value;

    if (!session) {
        redirect("/api/auth/signin");
    }

    if (!warehouseId) {
        redirect("/select-org");
    }

    const resolvedParams = await searchParams;
    const dateFilter = resolvedParams?.date || undefined;

    const data = await getData(warehouseId, dateFilter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {data.warehouseName} <span className="text-gray-400 font-light">|</span> Good {greeting}, <span className="text-ruby-700">{user.name?.split(" ")[0]}</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Here is what is happening in your warehouse.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <LiveClock />
                    <DashboardDateFilter />

                    <Link href="/stock/add" className="bg-ruby-700 hover:bg-ruby-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-ruby-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Add Stock
                    </Link>
                </div>
            </div>

            {/* Stats Cards - Premium Modern Look */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard
                    title="Total Stock"
                    value={data.productCount.toLocaleString()}
                    icon={Package}
                    trend="Currently Available"
                    color="ruby"
                />
                <StatCard
                    title={data.isFiltered ? "Trips Started" : "Active Trips"}
                    value={data.tripMetricCount.toString()}
                    icon={Truck}
                    subtitle={data.isFiltered ? "Initiated on selected date" : "Vehicles currently deployed"}
                    color="teal"
                />
                <StatCard
                    title={data.isFiltered ? "Invoices (Day)" : "Total Invoices"}
                    value={data.billCount.toString()}
                    icon={Receipt}
                    color="amber"
                    subtitle={data.isFiltered ? "Generated on selected date" : "All time generated"}
                />
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-gray-500">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-medium">Attention Needed</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{data.lowStockCount} Items</div>
                        <p className="text-sm text-gray-500">Low stock alert</p>
                    </div>
                    <Link href="/stock" className="text-sm font-bold text-ruby-700 mt-4 flex items-center gap-1 hover:gap-2 transition-all">
                        Check Inventory <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Recent Activity Feed (2/3 width) */}
                <div className="xl:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold text-gray-900">
                            {data.isFiltered ? "Day Activity" : "Recent Activity"}
                        </h2>
                        <Link href="/trips" className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                            <MoreHorizontal className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="space-y-6">
                        {!data.recentTrips || !Array.isArray(data.recentTrips) || data.recentTrips.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                No activity recorded for this period.
                            </div>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            data.recentTrips.map((trip: any) => (
                                <div key={trip.id} className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-4 -mx-4 rounded-2xl transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("p-3 rounded-2xl transition-colors", {
                                            "bg-amber-100 text-amber-600 group-hover:bg-amber-200": trip.status === "LOADED",
                                            "bg-teal-100 text-teal-600 group-hover:bg-teal-200": trip.status === "VERIFIED",
                                            "bg-blue-100 text-blue-600 group-hover:bg-blue-200": trip.status === "RETURNED"
                                        })}>
                                            {trip.status === "VERIFIED" ? <CheckCircleIcon /> : <Truck className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{trip.vehicle?.number || "Unknown Vehicle"}</h4>
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                <span className="font-medium text-gray-700">{trip.vehicle?.driverName}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                {trip.loadedItems.length} Products
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide", {
                                            "bg-amber-50 text-amber-700": trip.status === "LOADED",
                                            "bg-teal-50 text-teal-700": trip.status === "VERIFIED",
                                            "bg-blue-50 text-blue-700": trip.status === "RETURNED"
                                        })}>
                                            {trip.status === "LOADED" ? "In Transit" : trip.status}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-2 flex items-center justify-end gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(trip.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                        <Link href="/trips" className="text-gray-500 hover:text-ruby-700 font-medium text-sm flex items-center gap-2 transition-colors">
                            View All Movements <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Right Sidebar (1/3 width) - Quick Actions & Status */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-gunmetal to-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <h3 className="text-lg font-bold mb-6 relative z-10">System Status</h3>

                        <div className="space-y-6 relative z-10">
                            <StatusItem label="Database" status="Operational" />
                            <StatusItem label="API Gateway" status="Operational" />
                            <StatusItem label="Backup" status="Synced 1h ago" color="blue" />
                        </div>
                    </div>

                    <div className="bg-ruby-50 rounded-3xl p-8 border border-ruby-100">
                        <h3 className="text-lg font-bold text-ruby-900 mb-4">Quick Shortcuts</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/trips/new" className="bg-white p-4 rounded-xl shadow-sm text-center hover:shadow-md transition-all hover:scale-105">
                                <div className="bg-teal-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-teal-600">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-gray-800">New Trip</span>
                            </Link>
                            <Link href="/bills" className="bg-white p-4 rounded-xl shadow-sm text-center hover:shadow-md transition-all hover:scale-105">
                                <div className="bg-amber-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-gray-800">Invoices</span>
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({ title, value, icon: Icon, subtitle, trend, color }: any) {
    const colors: any = {
        ruby: "text-ruby-600 bg-ruby-50 border-ruby-100",
        teal: "text-teal-600 bg-teal-50 border-teal-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
    };
    const colorClass = colors[color as string] || "text-gray-600 bg-gray-50 border-gray-100";

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-xl", colorClass)}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
                {subtitle && <p className="text-xs text-gray-400 mt-2 font-medium">{subtitle}</p>}
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatusItem({ label, status }: any) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">{label}</span>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                <span className="text-white text-sm font-medium">{status}</span>
            </div>
        </div>
    );
}

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
        </svg>
    )
}
