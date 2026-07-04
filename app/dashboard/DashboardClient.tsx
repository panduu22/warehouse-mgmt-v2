"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
    Package, Truck, Receipt, ArrowRight, TrendingUp, TrendingDown, 
    Clock, AlertTriangle, Plus, ClipboardCheck, IndianRupee, 
    AlertCircle, FileText, Download, CheckCircle2, Building, FileSpreadsheet, RefreshCw, ChevronDown
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardDateFilterAdvanced, DateRange } from "@/components/DashboardDateFilterAdvanced";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export function DashboardClient({ initialData, user, warehouses }: { initialData: any, user: any, warehouses: any[] }) {
    const [greeting, setGreeting] = useState("Welcome");
    const [warehouseId, setWarehouseId] = useState<string>(initialData.warehouseId || "ALL");
    const [dateRange, setDateRange] = useState<DateRange>({
        start: new Date(new Date().setHours(0, 0, 0, 0)),
        end: new Date(new Date().setHours(23, 59, 59, 999)),
        label: "Today"
    });
    const [compareEnabled, setCompareEnabled] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>(initialData);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting("Good Morning");
        else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
        else if (hour >= 17 && hour < 21) setGreeting("Good Evening");
        else setGreeting("Good Night");
    }, []);

    // Get Comparison Date Range based on Primary Date Range selection
    const getCompareRange = (start: Date, end: Date, label: string) => {
        const diff = end.getTime() - start.getTime();
        const compareStart = new Date(start.getTime() - diff - 24 * 60 * 60 * 1000);
        const compareEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
        
        if (label === "Today") {
            const yesterday = new Date(start);
            yesterday.setDate(yesterday.getDate() - 1);
            return { start: yesterday, end: yesterday };
        }
        
        if (label === "This Month") {
            const prevMonthStart = new Date(start);
            prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
            const prevMonthEnd = new Date(end);
            prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);
            return { start: prevMonthStart, end: prevMonthEnd };
        }

        if (label === "This Year") {
            const prevYearStart = new Date(start);
            prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
            const prevYearEnd = new Date(end);
            prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
            return { start: prevYearStart, end: prevYearEnd };
        }
        
        return { start: compareStart, end: compareEnd };
    };

    const fetchStats = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const params = new URLSearchParams();
            params.append("warehouseId", warehouseId);
            params.append("startDate", dateRange.start.toISOString());
            params.append("endDate", dateRange.end.toISOString());

            if (compareEnabled) {
                const comp = getCompareRange(dateRange.start, dateRange.end, dateRange.label);
                params.append("compareStartDate", comp.start.toISOString());
                params.append("compareEndDate", comp.end.toISOString());
            }

            const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
            if (res.ok) {
                const stats = await res.json();
                setDashboardData(stats);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Failed to fetch dashboard statistics", err);
        } finally {
            setIsRefreshing(false);
        }
    }, [warehouseId, dateRange, compareEnabled]);

    useEffect(() => {
        // Skip first trigger on initial load if params match defaults
        if (warehouseId === "ALL" && dateRange.label === "Today" && compareEnabled) {
            // Already loaded from SSR
            return;
        }
        fetchStats();
    }, [warehouseId, dateRange, compareEnabled, fetchStats]);

    const handleExport = () => {
        if (!dashboardData) return;
        
        const kpiData = [
            { Metric: "Total Sales", Value: `₹${dashboardData.metrics.sales.current}`, Growth: compareEnabled ? `${dashboardData.metrics.sales.growth ?? 0}%` : "-" },
            { Metric: "Invoices Generated", Value: dashboardData.metrics.invoices.current, Growth: compareEnabled ? `${dashboardData.metrics.invoices.growth ?? 0}%` : "-" },
            { Metric: "Restocks Completed", Value: dashboardData.metrics.restocks.current, Growth: compareEnabled ? `${dashboardData.metrics.restocks.growth ?? 0}%` : "-" },
            { Metric: "Trips Initiated", Value: dashboardData.metrics.trips.current, Growth: compareEnabled ? `${dashboardData.metrics.trips.growth ?? 0}%` : "-" },
            { Metric: "Active Fleet Vehicles", Value: dashboardData.metrics.activeTrips, Growth: "-" },
            { Metric: "Pending Verification Trips", Value: dashboardData.metrics.pendingVerifications, Growth: "-" },
            { Metric: "Total Inventory Value", Value: `₹${Math.round(dashboardData.totalStockValue)}`, Growth: "-" }
        ];
        
        const productSalesData = dashboardData.topProducts.map((p: any) => ({
            "Product Name": p._id,
            "Pack": p.pack,
            "Flavour": p.flavour,
            "Total Quantity Sold": p.totalQty,
            "Total Revenue Generated": `₹${p.totalSales}`
        }));
        
        const vehicleSalesData = dashboardData.topVehicles.map((v: any) => ({
            "Vehicle Number": v.number,
            "Driver": v.driver,
            "Trip Count": v.tripCount,
            "Total Sales Generated": `₹${v.totalSales}`
        }));

        const wb = XLSX.utils.book_new();
        
        const wsKpis = XLSX.utils.json_to_sheet(kpiData);
        const wsProducts = XLSX.utils.json_to_sheet(productSalesData);
        const wsVehicles = XLSX.utils.json_to_sheet(vehicleSalesData);
        
        XLSX.utils.book_append_sheet(wb, wsKpis, "KPI Summary");
        XLSX.utils.book_append_sheet(wb, wsProducts, "Top Selling Products");
        XLSX.utils.book_append_sheet(wb, wsVehicles, "Top Vehicles");
        
        XLSX.writeFile(wb, `Warehouse_Dashboard_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 26 } }
    };

    return (
        <div className="space-y-8 w-full max-w-7xl mx-auto pb-10">
            {/* Header Control Panel */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-card border border-border p-6 rounded-3xl shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        {greeting}, <span className="text-primary">{user.name?.split(" ")[0]}</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm font-medium">
                        Analytical dashboard for operations.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    {/* Warehouse Filter */}
                    <div className="relative">
                        <select
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                            className="h-10 pl-9 pr-8 bg-card border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none shadow-sm cursor-pointer"
                        >
                            {warehouses.map((w) => (
                                <option key={w._id} value={w._id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                        <Building className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                        <ChevronDown className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>

                    <DashboardDateFilterAdvanced
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        compareEnabled={compareEnabled}
                        setCompareEnabled={setCompareEnabled}
                        onRefresh={fetchStats}
                        isRefreshing={isRefreshing}
                        lastUpdated={lastUpdated}
                    />

                    {/* Export Action */}
                    <button
                        onClick={handleExport}
                        className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-emerald-55 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all text-white active:scale-95 cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export report
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <Link href="/trips/new" className="group bg-card hover:bg-primary/5 border border-border hover:border-primary/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Truck className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Load Vehicle</span>
                </Link>
                
                <Link href="/trips" className="group bg-card hover:bg-blue-500/5 border border-border hover:border-blue-500/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-foreground group-hover:text-blue-500 transition-colors">Verify Trips</span>
                </Link>
                
                <Link href="/stock/add" className="group bg-card hover:bg-emerald-500/5 border border-border hover:border-emerald-500/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-foreground group-hover:text-emerald-500 transition-colors">Add Stock</span>
                </Link>
                
                <Link href="/bills" className="group bg-card hover:bg-amber-500/5 border border-border hover:border-amber-500/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-foreground group-hover:text-amber-500 transition-colors">View Invoices</span>
                </Link>
            </motion.div>

            {/* KPI Stats Grid */}
            <motion.div 
                variants={containerVariants} initial="hidden" animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
            >
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Total Sales"
                        value={`₹${dashboardData.metrics.sales.current.toLocaleString('en-IN')}`}
                        icon={IndianRupee}
                        color="emerald"
                        growth={dashboardData.metrics.sales.growth}
                        compare={compareEnabled}
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Total Invoices"
                        value={dashboardData.metrics.invoices.current.toString()}
                        icon={FileText}
                        color="amber"
                        growth={dashboardData.metrics.invoices.growth}
                        compare={compareEnabled}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Total Stock Value"
                        value={`₹${Math.round(dashboardData.totalStockValue).toLocaleString('en-IN')}`}
                        icon={Package}
                        color="primary"
                        subtitle="Current Stock Valuation"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Active Fleet"
                        value={dashboardData.metrics.activeTrips.toString()}
                        icon={Truck}
                        color="blue"
                        subtitle="Vehicles currently out"
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Pending Verification"
                        value={dashboardData.metrics.pendingVerifications.toString()}
                        icon={ClipboardCheck}
                        color="rose"
                        subtitle="Trips awaiting verify"
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Restocks Completed"
                        value={dashboardData.metrics.restocks.current.toString()}
                        icon={Download}
                        color="indigo"
                        growth={dashboardData.metrics.restocks.growth}
                        compare={compareEnabled}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Outstanding Payments"
                        value="₹0"
                        icon={AlertCircle}
                        color="gray"
                        subtitle="Mocked outstanding"
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <Link href="/stock" className="block h-full">
                        <Card className="h-full border-rose-200 dark:border-rose-900/50 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer bg-rose-50/30 dark:bg-rose-950/20">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                                    <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-400">Attention Needed</CardTitle>
                                </div>
                                <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">{dashboardData.lowStockItems.length} SKUs Low</div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-bold text-rose-600 dark:text-rose-500 flex items-center gap-1">
                                    Check Inventory <ArrowRight className="w-4 h-4" />
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>
            </motion.div>

            {/* Performance Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Products */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-md font-bold text-foreground">Top Selling Products</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.topProducts.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">No product sales in this period.</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {dashboardData.topProducts.map((p: any, i: number) => (
                                    <div key={`${p._id}-${i}`} className="p-4 flex items-center justify-between hover:bg-muted/10">
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">{p._id}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">{p.pack} {p.flavour !== "-" ? `· ${p.flavour}` : ""}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-foreground">₹{p.totalSales.toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{p.totalQty} units sold</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Vehicles */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-md font-bold text-foreground">Top Vehicles</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.topVehicles.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">No vehicle deliveries recorded.</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {dashboardData.topVehicles.map((v: any, i: number) => (
                                    <div key={`${v._id}-${i}`} className="p-4 flex items-center justify-between hover:bg-muted/10">
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">{v.number}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Driver: {v.driver}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-foreground">₹{v.totalSales.toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{v.tripCount} trips</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Most Restocked */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-md font-bold text-foreground">Most Restocked Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.mostRestocked.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">No stock actions recorded.</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {dashboardData.mostRestocked.map((m: any, i: number) => (
                                    <div key={`${m._id}-${i}`} className="p-4 flex items-center justify-between hover:bg-muted/10">
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">{m.product?.name || "Unknown"}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">{m.product?.pack} {m.product?.flavour !== "-" ? `· ${m.product?.flavour}` : ""}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                +{m.qtyAdded.toLocaleString()} units
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Most Returned */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-md font-bold text-foreground">Most Returned Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.mostReturned.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">No returns verified.</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {dashboardData.mostReturned.map((m: any, i: number) => (
                                    <div key={`${m._id}-${i}`} className="p-4 flex items-center justify-between hover:bg-muted/10">
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">{m.product?.name || "Unknown"}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">{m.product?.pack} {m.product?.flavour !== "-" ? `· ${m.product?.flavour}` : ""}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                                {m.qtyReturned.toLocaleString()} returned
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recent Activity Timeline (2 cols) */}
                <div className="lg:col-span-2">
                    <Card className="border-border shadow-sm h-full max-h-[500px] flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center pb-4 border-b">
                            <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                            <span className="text-xs font-semibold bg-muted px-2 py-1 rounded text-muted-foreground">All Events</span>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {dashboardData.recentActivity.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                                    <Clock className="w-8 h-8 opacity-20 mb-3" />
                                    No activity recorded in this date range.
                                </div>
                            ) : (
                                <div className="relative border-l border-border ml-3 space-y-6">
                                    {dashboardData.recentActivity.map((activity: any, index: number) => (
                                        <div key={`${activity.type}-${activity.id}-${index}`} className="relative pl-6">
                                            {/* Timeline dot/icon */}
                                            <div className={clsx(
                                                "absolute -left-[17px] top-0.5 w-8 h-8 rounded-full border-[3px] border-background flex items-center justify-center",
                                                activity.type === "TRIP" && "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
                                                activity.type === "BILL" && "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
                                                activity.type === "RESTOCK" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                            )}>
                                                {activity.type === "TRIP" && <Truck className="w-3.5 h-3.5" />}
                                                {activity.type === "BILL" && <Receipt className="w-3.5 h-3.5" />}
                                                {activity.type === "RESTOCK" && <Download className="w-3.5 h-3.5" />}
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div>
                                                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                                                        {activity.title}
                                                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                            {activity.type}
                                                        </span>
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground mt-0.5">{activity.subtitle}</p>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p suppressHydrationWarning className="text-xs text-muted-foreground/80 flex items-center gap-1 sm:justify-end">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(activity.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                                                    </p>
                                                    <p className={clsx("text-xs font-bold mt-1", 
                                                        activity.status === "COMPLETED" || activity.status === "VERIFIED" ? "text-emerald-500" :
                                                        activity.status === "LOADED" ? "text-amber-500" : "text-blue-500"
                                                    )}>
                                                        {activity.status === "LOADED" ? "IN TRANSIT" : activity.status}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Low Stock Widget (1 col) */}
                <div className="lg:col-span-1">
                    <Card className="border-border shadow-sm h-full max-h-[500px] flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center pb-4 border-b">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-rose-600 dark:text-rose-500">
                                <AlertCircle className="w-5 h-5" />
                                Low Stock Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                            {dashboardData.lowStockItems.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-3" />
                                    All products are well stocked.
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {dashboardData.lowStockItems.map((item: any) => (
                                        <div key={item._id} className="p-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-foreground text-sm leading-tight">{item.name}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.pack} {item.flavour !== "-" ? `· ${item.flavour}` : ""}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                                        {item.quantity} Left
                                                    </span>
                                                </div>
                                            </div>
                                            <Link href={`/stock/add`} className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors">
                                                <Plus className="w-3.5 h-3.5" /> Restock Now
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, subtitle, growth, color, compare }: any) {
    const colors = {
        primary: "text-primary bg-primary/10 border-primary/20",
        emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
        gray: "text-muted-foreground bg-muted border-border",
    }[color as string] || "text-foreground bg-muted border-border";

    return (
        <Card className="border-border shadow-sm hover:shadow-md transition-all duration-300 h-full">
            <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div className={clsx("p-2.5 rounded-xl border", colors)}>
                    <Icon className="w-5 h-5" />
                </div>
                
                {compare && growth !== undefined && (
                    <div className={clsx(
                        "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border",
                        growth > 0 
                            ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" 
                            : growth < 0 
                                ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
                                : "text-muted-foreground bg-muted border-border"
                    )}>
                        {growth > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : growth < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                        {growth > 0 ? "+" : ""}{growth}%
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-xs font-medium mb-1.5">{title}</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
                {(subtitle || compare) && (
                    <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                        {subtitle || "vs previous period"}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
