"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { 
    IndianRupee, Package, Truck, ArrowRight, Activity, TrendingUp, AlertCircle, FileText, 
    Download, CheckCircle2, Search, Filter, RefreshCw, X, Receipt, Building, ChevronDown, 
    ClipboardCheck, FileSpreadsheet, AlertTriangle, CalendarDays, Lock, Unlock, Clock, TrendingDown, Plus
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardDateFilterAdvanced, DateRange } from "@/components/DashboardDateFilterAdvanced";
import * as XLSX from "xlsx";
import { format, subDays } from "date-fns";

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
            params.append("startDate", format(dateRange.start, "yyyy-MM-dd"));
            params.append("endDate", format(dateRange.end, "yyyy-MM-dd"));

            if (compareEnabled) {
                const comp = getCompareRange(dateRange.start, dateRange.end, dateRange.label);
                params.append("compareStartDate", format(comp.start, "yyyy-MM-dd"));
                params.append("compareEndDate", format(comp.end, "yyyy-MM-dd"));
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

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
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
            { Metric: "Total Inventory Value", Value: `₹${Math.round(dashboardData.totalStockValue)}`, Growth: "-" },
            { Metric: "Total Outstanding Balance", Value: `₹${dashboardData.balanceStats?.totalOutstandingBalance || 0}`, Growth: "-" },
            { Metric: "Balance Collected Today", Value: `₹${dashboardData.balanceStats?.totalCollectedToday || 0}`, Growth: "-" }
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
        <div className="space-y-6 w-full max-w-7xl mx-auto pb-12">
            {/* Header Control Panel */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-card border border-border px-6 py-5 rounded-2xl shadow-erp-card">
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{greeting}</p>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                        {user.name?.split(" ")[0]}<span className="text-muted-foreground/40">'s</span> Dashboard
                    </h1>
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

            {/* Subscription Validity Widget */}
            {(user.grantedAt && user.expiresAt) ? (
                <div className="bg-card border border-border p-5 rounded-2xl shadow-erp-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${new Date(user.expiresAt) < new Date() ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                            {new Date(user.expiresAt) < new Date() ? <Lock className="w-6 h-6" /> : <CalendarDays className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-black text-foreground flex items-center gap-2">
                                Subscription Status
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Valid From: <span className="text-foreground">{format(new Date(user.grantedAt), "dd MMM yyyy")}</span>
                                </span>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                                    {new Date(user.expiresAt) < new Date() ? (
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    )}
                                    Valid Until: <span className="text-foreground">{format(new Date(user.expiresAt), "dd MMM yyyy")}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    {new Date(user.expiresAt) < new Date() && (
                        <div className="bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl text-rose-600 font-black text-sm uppercase tracking-widest animate-pulse">
                            Access Expired on {format(new Date(user.expiresAt), "dd MMM yyyy")}
                        </div>
                    )}
                </div>
            ) : user.expiresAt ? (
                /* Fallback if grantedAt is missing but expiresAt exists */
                <div className="bg-card border border-border p-5 rounded-2xl shadow-erp-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${new Date(user.expiresAt) < new Date() ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                            {new Date(user.expiresAt) < new Date() ? <Lock className="w-6 h-6" /> : <CalendarDays className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-black text-foreground flex items-center gap-2">
                                Subscription Status
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Valid From: <span className="text-foreground">{format(subDays(new Date(user.expiresAt), 365), "dd MMM yyyy")}</span>
                                </span>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                                    {new Date(user.expiresAt) < new Date() ? (
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    )}
                                    Valid Until: <span className="text-foreground">{format(new Date(user.expiresAt), "dd MMM yyyy")}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    {new Date(user.expiresAt) < new Date() && (
                        <div className="bg-rose-500/10 border border-rose-500/30 px-4 py-2 rounded-xl text-rose-600 font-black text-sm uppercase tracking-widest animate-pulse">
                            Access Expired on {format(new Date(user.expiresAt), "dd MMM yyyy")}
                        </div>
                    )}
                </div>
            ) : null}

            {/* Quick Actions */}
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
                {[
                    { href: "/trips/new", icon: Truck, label: "Load Vehicle", color: "primary", bg: "bg-primary/10", text: "text-primary", hover: "hover:border-primary/25 hover:bg-primary/5" },
                    { href: "/trips", icon: ClipboardCheck, label: "Verify Trips", color: "blue", bg: "bg-blue-500/10", text: "text-blue-600", hover: "hover:border-blue-500/25 hover:bg-blue-50" },
                    { href: "/stock/add", icon: Package, label: "Add Stock", color: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-600", hover: "hover:border-emerald-500/25 hover:bg-emerald-50" },
                    { href: "/bills", icon: Receipt, label: "View Invoices", color: "amber", bg: "bg-amber-500/10", text: "text-amber-600", hover: "hover:border-amber-500/25 hover:bg-amber-50" },
                ].map(({ href, icon: Icon, label, bg, text, hover }) => (
                    <Link key={href} href={href} className={`group bg-card border border-border ${hover} p-5 rounded-2xl shadow-erp-card hover:shadow-erp-hover flex flex-col items-center justify-center gap-3 transition-all duration-200`}>
                        <div className={`w-11 h-11 rounded-2xl ${bg} ${text} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-xs font-semibold text-muted-foreground group-hover:${text} transition-colors text-center leading-tight`}>{label}</span>
                    </Link>
                ))}
            </motion.div>

            {/* KPI Stats Grid */}
            <motion.div 
                variants={containerVariants} initial="hidden" animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="💰 Net Sales"
                        value={`₹${dashboardData.metrics.sales.current.toLocaleString('en-IN')}`}
                        icon={IndianRupee}
                        color="emerald"
                        growth={dashboardData.metrics.sales.growth}
                        compare={compareEnabled}
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="📊 Reports (Invoices)"
                        value={dashboardData.metrics.invoices.current.toString()}
                        icon={FileText}
                        color="amber"
                        growth={dashboardData.metrics.invoices.growth}
                        compare={compareEnabled}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="📦 Products Value"
                        value={`₹${Math.round(dashboardData.totalStockValue).toLocaleString('en-IN')}`}
                        icon={Package}
                        color="primary"
                        subtitle="Current Stock Valuation"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="🚚 Vehicles Active"
                        value={dashboardData.metrics.activeTrips.toString()}
                        icon={Truck}
                        color="blue"
                        subtitle="Vehicles currently out"
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="✅ Verified (Pending)"
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
                        title="🔴 Balance Outstanding"
                        value={`₹${(dashboardData.balanceStats?.totalOutstandingBalance || 0).toLocaleString('en-IN')}`}
                        icon={AlertCircle}
                        color="rose"
                        subtitle="Across all vehicles"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="💵 Cash / Collected"
                        value={`₹${(dashboardData.balanceStats?.totalCollectedToday || 0).toLocaleString('en-IN')}`}
                        icon={TrendingUp}
                        color="emerald"
                        subtitle="Balance payments received"
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <Link href="/stock" className="block h-full">
                        <Card className="h-full rounded-2xl shadow-erp-card hover:shadow-erp-hover border-rose-200 dark:border-rose-900/50 flex flex-col justify-between transition-all cursor-pointer bg-rose-50/30 dark:bg-rose-950/20">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top Selling Products */}
                <Card className="border-border shadow-erp-card rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/60 pb-3 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-foreground">Top Selling Products</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.topProducts.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 opacity-20" />
                                No product sales in this period.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {dashboardData.topProducts.map((p: any, i: number) => (
                                    <div key={`${p._id}-${i}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">#{i+1}</span>
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-sm text-foreground truncate">{p._id}</h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">{p.pack}{p.flavour !== "-" ? ` · ${p.flavour}` : ""}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-4">
                                            <p className="font-bold text-sm text-foreground">₹{p.totalSales.toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{p.totalQty.toLocaleString()} units</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Vehicles */}
                <Card className="border-border shadow-erp-card rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/60 pb-3 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-foreground">Top Vehicles by Sales</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.topVehicles.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                                <Truck className="w-8 h-8 opacity-20" />
                                No vehicle deliveries recorded.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {dashboardData.topVehicles.map((v: any, i: number) => {
                                    const pct = dashboardData.topVehicles[0]?.totalSales > 0 ? Math.round((v.totalSales / dashboardData.topVehicles[0].totalSales) * 100) : 0;
                                    return (
                                        <div key={`${v._id}-${i}`} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">#{i+1}</span>
                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-sm text-foreground">{v.number}</h4>
                                                        <p className="text-xs text-muted-foreground">{v.driver} · {v.tripCount} trips</p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-sm text-foreground shrink-0 ml-4">₹{v.totalSales.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1 ml-7">
                                                <div className="bg-primary/60 h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Most Restocked */}
                <Card className="border-border shadow-erp-card rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/60 pb-3 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-foreground">Most Restocked Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.mostRestocked.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 opacity-20" />No stock actions recorded.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {dashboardData.mostRestocked.map((m: any, i: number) => (
                                    <div key={`${m._id}-${i}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">#{i+1}</span>
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-sm text-foreground truncate">{m.product?.name || "Unknown"}</h4>
                                                <p className="text-xs text-muted-foreground">{m.product?.pack}{m.product?.flavour !== "-" ? ` · ${m.product?.flavour}` : ""}</p>
                                            </div>
                                        </div>
                                        <span className="badge badge-green shrink-0 ml-4">+{m.qtyAdded.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Most Returned */}
                <Card className="border-border shadow-erp-card rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-border/60 pb-3 pt-4 px-5">
                        <CardTitle className="text-sm font-semibold text-foreground">Most Returned Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dashboardData.mostReturned.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />All clear — no significant returns.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {dashboardData.mostReturned.map((m: any, i: number) => (
                                    <div key={`${m._id}-${i}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">#{i+1}</span>
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-sm text-foreground truncate">{m.product?.name || "Unknown"}</h4>
                                                <p className="text-xs text-muted-foreground">{m.product?.pack}{m.product?.flavour !== "-" ? ` · ${m.product?.flavour}` : ""}</p>
                                            </div>
                                        </div>
                                        <span className="badge badge-rose shrink-0 ml-4">{m.qtyReturned.toLocaleString()} back</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* Recent Activity Timeline (2 cols) */}
                <div className="lg:col-span-2">
                    <Card className="border-border shadow-erp-card h-full max-h-[520px] flex flex-col rounded-2xl overflow-hidden">
                        <CardHeader className="flex flex-row justify-between items-center pb-3 pt-4 px-5 border-b border-border/60">
                            <CardTitle className="text-sm font-semibold text-foreground">Recent Activity</CardTitle>
                            <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full text-muted-foreground">All Events</span>
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
                    <Card className="border-border shadow-erp-card h-full max-h-[520px] flex flex-col rounded-2xl overflow-hidden">
                        <CardHeader className="flex flex-row justify-between items-center pb-3 pt-4 px-5 border-b border-border/60">
                            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                Low Stock
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                            {dashboardData.lowStockItems.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-3" />
                                    All products are well stocked.
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {dashboardData.lowStockItems.map((item: any) => (
                                        <div key={item._id} className="px-5 py-3.5 hover:bg-muted/20 transition-colors">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-foreground text-sm leading-tight truncate">{item.name}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.pack}{item.flavour !== "-" ? ` · ${item.flavour}` : ""}</p>
                                                </div>
                                                <span className="badge badge-rose shrink-0">{item.quantity} left</span>
                                            </div>
                                            <Link href="/stock/add" className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 rounded-lg transition-colors">
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
    const iconColor = {
        primary: "text-primary bg-primary/10",
        emerald: "text-emerald-600 bg-emerald-50",
        amber: "text-amber-600 bg-amber-50",
        rose: "text-rose-600 bg-rose-50",
        blue: "text-blue-600 bg-blue-50",
        indigo: "text-indigo-600 bg-indigo-50",
        gray: "text-muted-foreground bg-muted",
    }[color as string] || "text-foreground bg-muted";

    return (
        <Card className="border-border rounded-2xl shadow-erp-card hover:shadow-erp-hover transition-all duration-200 h-full">
            <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between mb-3">
                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconColor)}>
                        <Icon className="w-4.5 h-4.5" />
                    </div>
                    {compare && growth !== undefined && (
                        <div className={clsx(
                            "flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                            growth > 0 
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
                                : growth < 0 
                                    ? "text-rose-700 bg-rose-50 border border-rose-200"
                                    : "text-muted-foreground bg-muted border border-border"
                        )}>
                            {growth > 0 ? <TrendingUp className="w-3 h-3" /> : growth < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                            {growth > 0 ? "+" : ""}{growth}%
                        </div>
                    )}
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1 truncate">{title}</p>
                <h3 className="text-[22px] font-bold text-foreground tracking-tight leading-none">{value}</h3>
                {(subtitle || compare) && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                        {subtitle || "vs previous period"}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
