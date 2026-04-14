"use client";
 
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Truck, Receipt, MoreHorizontal, ArrowRight, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import DashboardDateFilter from "@/components/DashboardDateFilter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardStockChart } from "@/components/DashboardCharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DashboardClient({ data, user }: { data: any, user: any }) {
    const [greeting, setGreeting] = useState("Welcome");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting("Good Morning");
        else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
        else if (hour >= 17 && hour < 21) setGreeting("Good Evening");
        else setGreeting("Good Night");
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
    };

    return (
        <div className="space-y-8 w-full">
            {/* Header Section */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">
                        {greeting},{" "}
                        <span className="text-primary">{user.name?.split(" ")[0]}</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                        Welcome back to <span className="text-primary font-bold">{data.warehouseName}</span>
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <DashboardDateFilter />

                    <Link href="/stock/add" className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Add Stock
                    </Link>
                </div>
            </motion.div>

            {/* Stats Cards - Premium Modern Look */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
            >
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Total Stock"
                        value={
                            <div className="space-y-1">
                                <div className="text-2xl font-black text-foreground">₹{Math.round(data.stockMetrics.totalValue).toLocaleString()}</div>
                                <div className="flex flex-col text-xs font-bold text-muted-foreground uppercase tracking-tight">
                                    <span>{data.stockMetrics.totalBottles.toLocaleString()} bottles</span>
                                    <span className="text-ruby-600/70">{data.stockMetrics.totalPacks} P + {data.stockMetrics.totalRemainder} B</span>
                                </div>
                            </div>
                        }
                        icon={Package}
                        trend="In Inventory"
                        color="ruby"
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title={data.isFiltered ? "Trips Started" : "Active Trips"}
                        value={data.tripMetricCount.toString()}
                        icon={Truck}
                        subtitle={data.isFiltered ? "Initiated on selected date" : "Vehicles currently deployed"}
                        color="teal"
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title={data.isFiltered ? "Invoices (Day)" : "Total Invoices"}
                        value={data.billCount.toString()}
                        icon={Receipt}
                        color="amber"
                        subtitle={data.isFiltered ? "Generated on selected date" : "All time generated"}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="h-full border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                <CardTitle className="text-sm font-medium">Attention Needed</CardTitle>
                            </div>
                            <div className="text-2xl font-bold text-foreground">{data.lowStockCount} Items</div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Low stock alert</p>
                            <Link href="/stock" className="text-sm font-bold text-primary mt-4 flex items-center gap-1 hover:gap-2 transition-all">
                                Check Inventory <ArrowRight className="w-4 h-4" />
                            </Link>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">

                {/* Left Side: Charts */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {/* Inject Recharts Component */}
                    <div className="md:col-span-2">
                        <DashboardStockChart />
                    </div>

                    <Card className="border-border shadow-sm h-full md:col-span-1">
                        <CardHeader className="flex flex-row justify-between items-center pb-2">
                            <CardTitle className="text-xl font-bold">
                                Quick Shortcuts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <Link href="/trips/new" className="bg-muted/50 p-4 rounded-xl shadow-sm border border-border/50 text-center hover:shadow-md hover:bg-muted transition-all hover:-translate-y-1 group">
                                    <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary transition-colors group-hover:bg-primary/20">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">New Trip</span>
                                </Link>
                                <Link href="/bills" className="bg-muted/50 p-4 rounded-xl shadow-sm border border-border/50 text-center hover:shadow-md hover:bg-muted transition-all hover:-translate-y-1 group">
                                    <div className="bg-amber-500/10 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-500 transition-colors group-hover:bg-amber-500/20">
                                        <Receipt className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">Invoices</span>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent Activity Feed */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="xl:col-span-3"
                >
                    <Card className="border-border shadow-sm h-full max-h-[600px] flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center pb-2 border-b">
                            <CardTitle className="text-xl font-bold">
                                {data.isFiltered ? "Day Activity" : "Recent Activity"}
                            </CardTitle>
                            <Link href="/trips" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="w-5 h-5" />
                            </Link>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0 z-10 custom-scrollbar">
                            <div className="divide-y divide-border">
                                {data.recentTrips.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        No activity recorded for this period.
                                    </div>
                                ) : (
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    data.recentTrips.map((trip: any, i: number) => (
                                        <motion.div 
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + i * 0.05 }}
                                            key={trip._id} 
                                            className="flex flex-col sm:flex-row sm:items-center justify-between group cursor-pointer hover:bg-muted/30 p-4 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx("p-3 rounded-xl transition-colors", {
                                                    "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20": trip.status === "LOADED",
                                                    "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20": trip.status === "VERIFIED",
                                                    "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20": trip.status === "RETURNED"
                                                })}>
                                                    {trip.status === "VERIFIED" ? <CheckCircleIcon /> : <Truck className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-foreground text-sm">{trip.vehicleId?.number || "Unknown Vehicle"}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                        <span className="font-medium text-foreground">{trip.vehicleId?.driverName}</span>
                                                        <span className="w-1 h-1 bg-border rounded-full"></span>
                                                        {trip.loadedItems.length} Products
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right mt-3 sm:mt-0 pl-[3.25rem] sm:pl-0">
                                                <span className={clsx("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex", {
                                                    "bg-amber-500/10 text-amber-600 border border-amber-500/20": trip.status === "LOADED",
                                                    "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20": trip.status === "VERIFIED",
                                                    "bg-blue-500/10 text-blue-600 border border-blue-500/20": trip.status === "RETURNED"
                                                })}>
                                                    {trip.status === "LOADED" ? "In Transit" : trip.status}
                                                </span>
                                                <p className="text-xs text-muted-foreground/70 mt-2 flex items-center sm:justify-end gap-1 font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(trip.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({ title, value, icon: Icon, subtitle, trend, color }: any) {
    const colors = {
        ruby: "text-primary bg-primary/10",
        teal: "text-emerald-500 bg-emerald-500/10",
        amber: "text-amber-500 bg-amber-500/10",
    }[color as string] || "text-foreground bg-muted";

    return (
        <Card className="border-border shadow-sm hover:shadow-md transition-all duration-300 h-full">
            <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div className={clsx("p-2.5 rounded-xl", colors)}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </span>
                )}
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-xs font-medium mb-1.5">{title}</p>
                {typeof value === "string" || typeof value === "number" ? (
                    <h3 className="text-2xl font-extrabold text-foreground tracking-tight">{value}</h3>
                ) : (
                    value
                )}
                {subtitle && <p className="text-[10px] text-muted-foreground/70 mt-2 font-medium">{subtitle}</p>}
            </CardContent>
        </Card>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatusItem({ label, status }: any) {
    return (
        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
            <span className="text-white/60 text-xs font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span className="text-white text-xs font-bold">{status}</span>
            </div>
        </div>
    );
}

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
        </svg>
    )
}
