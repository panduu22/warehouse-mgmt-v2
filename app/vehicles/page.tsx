"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Truck, User, Trash2, Loader2, TrendingUp, Package, BarChart2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import clsx from "clsx";
import { useWarehouse } from "@/components/WarehouseContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Vehicle {
    _id: string;
    number: string;
    driverName: string;
    totalSales: number;
    totalBottles: number;
    tripCount: number;
}

type Timeframe = "weekly" | "monthly" | "all";

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) => {
    if (!amount) return "₹0";
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
};

const formatCurrencyFull = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
    const { data: session } = useSession();
    const { activeWarehouse } = useWarehouse();

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [number, setNumber] = useState("");
    const [driver, setDriver] = useState("");

    const fetchVehicles = useCallback(async (tf: Timeframe) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/vehicles/sales-summary?timeframe=${tf}`);
            if (res.ok) {
                const data = await res.json();
                setVehicles(data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [activeWarehouse?.id]);

    useEffect(() => {
        fetchVehicles(timeframe);
    }, [timeframe, fetchVehicles, activeWarehouse?.id]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch("/api/vehicles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number, driverName: driver }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to add vehicle");
            }
            setNumber("");
            setDriver("");
            fetchVehicles(timeframe);
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to add vehicle");
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(id: string, vehicleNumber: string) {
        if (!confirm(`Delete vehicle ${vehicleNumber}? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to delete vehicle");
            }
            fetchVehicles(timeframe);
        } catch (e: any) {
            alert(e.message || "Failed to delete vehicle");
        } finally {
            setDeletingId(null);
        }
    }

    // ── Summary stats ──────────────────────────────────────────────────────────
    const totalFleetSales = vehicles.reduce((sum, v) => sum + (v.totalSales || 0), 0);
    const totalTrips = vehicles.reduce((sum, v) => sum + (v.tripCount || 0), 0);
    const topVehicle = vehicles[0]; // already sorted by sales desc

    const timeframeLabel: Record<Timeframe, string> = {
        weekly: "This Week",
        monthly: "This Month",
        all: "All Time",
    };

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-10">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                    <Truck className="w-8 h-8 text-primary" />
                    Vehicle Management
                </h1>

                {/* Timeframe Filter */}
                <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
                    {(["weekly", "monthly", "all"] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={clsx(
                                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                                timeframe === tf
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf === "weekly" ? "This Week" : tf === "monthly" ? "This Month" : "All Time"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Fleet Summary Cards */}
            {!loading && vehicles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                Fleet Sales · {timeframeLabel[timeframe]}
                            </p>
                            <p className="text-2xl font-black text-emerald-500 mt-0.5">
                                {formatCurrency(totalFleetSales)}
                            </p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <BarChart2 className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                Total Trips · {timeframeLabel[timeframe]}
                            </p>
                            <p className="text-2xl font-black text-foreground mt-0.5">{totalTrips}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-amber-500/10 rounded-xl">
                            <Truck className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                Top Vehicle · {timeframeLabel[timeframe]}
                            </p>
                            <p className="text-lg font-black text-foreground mt-0.5 truncate">
                                {topVehicle?.totalSales > 0 ? topVehicle.number : "—"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vehicle List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12 bg-card rounded-2xl border border-border">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border">
                            <p className="text-muted-foreground font-medium">No vehicles found in the fleet.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} · sorted by sales ↓
                            </p>

                            {vehicles.map((v, rank) => {
                                const hasSales = v.totalSales > 0;
                                const rankColors = ["text-amber-500", "text-slate-400", "text-orange-600"];
                                const isTopThree = rank < 3 && hasSales;

                                return (
                                    <div
                                        key={v._id}
                                        className="bg-card p-5 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            {/* Rank + Icon */}
                                            <Link
                                                href={`/vehicles/${v._id}`}
                                                className="flex-1 flex items-center gap-4 min-w-0"
                                            >
                                                <div className="relative shrink-0">
                                                    <div className="bg-primary/10 p-4 rounded-xl text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                                        <Truck className="w-6 h-6" />
                                                    </div>
                                                    {isTopThree && (
                                                        <span
                                                            className={clsx(
                                                                "absolute -top-2 -right-2 text-xs font-black leading-none",
                                                                rankColors[rank]
                                                            )}
                                                        >
                                                            #{rank + 1}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Vehicle Info */}
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                                                        {v.number}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5 font-medium italic">
                                                        <User className="w-4 h-4 shrink-0" />
                                                        {v.driverName}
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Sales Stats */}
                                            <div className="flex items-center gap-6 shrink-0">
                                                {/* Trip count */}
                                                <div className="hidden sm:block text-center">
                                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                                        Trips
                                                    </p>
                                                    <p className="text-lg font-bold text-foreground">
                                                        {v.tripCount}
                                                    </p>
                                                </div>

                                                {/* Total Sales */}
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                                        Sales
                                                    </p>
                                                    <p
                                                        className={clsx(
                                                            "text-xl font-black",
                                                            hasSales ? "text-emerald-500" : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {hasSales ? formatCurrency(v.totalSales) : "—"}
                                                    </p>
                                                </div>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(v._id, v.number)}
                                                    disabled={deletingId === v._id}
                                                    title="Delete vehicle"
                                                    className="p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 active:scale-90"
                                                >
                                                    {deletingId === v._id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sales Progress Bar (relative to top vehicle) */}
                                        {hasSales && topVehicle?.totalSales > 0 && (
                                            <div className="mt-4">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-muted-foreground">
                                                        {v.totalBottles.toLocaleString("en-IN")} bottles
                                                    </span>
                                                    <span className="text-xs font-bold text-emerald-500">
                                                        {formatCurrencyFull(v.totalSales)}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                                                        style={{
                                                            width: `${Math.round((v.totalSales / topVehicle.totalSales) * 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Add Form */}
                <div className="bg-card p-8 rounded-2xl shadow-sm border border-border h-fit sticky top-24">
                    <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Add New Vehicle
                    </h2>
                    <form onSubmit={handleAdd} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block px-1">
                                Vehicle Number
                            </label>
                            <input
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground transition-all placeholder:text-muted-foreground/50"
                                placeholder="KA-05-AB-1234"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block px-1">
                                Driver Name
                            </label>
                            <input
                                value={driver}
                                onChange={(e) => setDriver(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground transition-all placeholder:text-muted-foreground/50"
                                placeholder="John Doe"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-black transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest"
                        >
                            {adding ? "Registering..." : "Add to Fleet"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
