"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Truck, User, Trash2, Loader2, TrendingUp, Package, BarChart2, Wallet, AlertCircle, X, Clock, CheckCircle2 } from "lucide-react";
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
    dailyBalance?: number;
    totalOutstandingBalance?: number;
}

type Timeframe = "weekly" | "monthly" | "all";

interface CollectBalancePayload {
    vehicleId: string;
    vehicleNumber: string;
    outstanding: number;
}

interface PaymentRecord {
    _id: string;
    amount: number;
    paymentMethod: "CASH" | "UPI";
    remarks?: string;
    collectedBy?: { name?: string; email?: string };
    collectedAt: string;
}

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

// ── Collect Balance Modal ──────────────────────────────────────────────────────

function CollectBalanceModal({
    payload,
    onClose,
    onSuccess,
}: {
    payload: CollectBalancePayload;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [method, setMethod] = useState<"CASH" | "UPI">("CASH");
    const [amount, setAmount] = useState("");
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const amountNum = Math.max(0, parseFloat(amount) || 0);
    const exceedsOutstanding = amountNum > payload.outstanding + 0.01;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (amountNum <= 0) { setError("Amount must be greater than 0"); return; }
        if (exceedsOutstanding) { setError(`Amount exceeds outstanding balance ₹${payload.outstanding.toFixed(2)}`); return; }

        setSubmitting(true);
        setError("");
        try {
            const res = await fetch(`/api/vehicles/${payload.vehicleId}/collect-balance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amountNum, paymentMethod: method, remarks }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to collect balance");
            }
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || "Failed to collect balance");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 px-6 py-5 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-rose-500" />
                            Collect Balance
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">Vehicle: <span className="font-bold text-foreground">{payload.vehicleNumber}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Outstanding badge */}
                <div className="px-6 pt-5">
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
                        <span className="text-xs font-black text-rose-600 uppercase tracking-widest">Outstanding Balance</span>
                        <span className="text-xl font-black text-rose-600">₹{payload.outstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Payment Method */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Payment Method</label>
                        <div className="flex gap-3">
                            {(["CASH", "UPI"] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMethod(m)}
                                    className={clsx(
                                        "flex-1 py-3 rounded-xl font-black text-sm transition-all border-2",
                                        method === m
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg"
                                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                    )}
                                >
                                    {m === "CASH" ? "💵 Cash" : "📱 UPI"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Amount Received</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">₹</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                                className={clsx(
                                    "w-full pl-9 pr-4 py-3 rounded-xl border-2 text-foreground font-bold bg-background focus:outline-none focus:ring-0 transition-all text-base",
                                    exceedsOutstanding ? "border-rose-500" : "border-border focus:border-primary"
                                )}
                                required
                            />
                        </div>
                        {exceedsOutstanding && (
                            <p className="text-xs text-rose-500 font-bold">Cannot exceed outstanding balance ₹{payload.outstanding.toFixed(2)}</p>
                        )}
                        {/* Quick fill buttons */}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setAmount(String(payload.outstanding))}
                                className="text-[10px] font-black text-primary border border-primary/30 px-3 py-1 rounded-lg hover:bg-primary/10 transition-colors">
                                Full ₹{payload.outstanding.toFixed(0)}
                            </button>
                            <button type="button" onClick={() => setAmount(String(Math.floor(payload.outstanding / 2)))}
                                className="text-[10px] font-black text-muted-foreground border border-border px-3 py-1 rounded-lg hover:bg-muted transition-colors">
                                Half ₹{Math.floor(payload.outstanding / 2)}
                            </button>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Remarks (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Partial payment for Trip #..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary text-foreground bg-background focus:outline-none focus:ring-0 transition-all text-sm"
                        />
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                            <p className="text-rose-600 font-bold text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || amountNum <= 0 || exceedsOutstanding}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {submitting ? "Recording..." : "Record Payment"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Payment History Modal ──────────────────────────────────────────────────────

function PaymentHistoryModal({
    vehicleId,
    vehicleNumber,
    onClose,
}: {
    vehicleId: string;
    vehicleNumber: string;
    onClose: () => void;
}) {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/vehicles/${vehicleId}/payment-history`)
            .then(r => r.json())
            .then(d => { setPayments(d.payments || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [vehicleId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card rounded-3xl shadow-2xl border border-border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Payment History
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{vehicleNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">No payment history found.</div>
                    ) : (
                        payments.map(p => (
                            <div key={p._id} className="bg-muted/30 rounded-2xl p-4 border border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={clsx("text-xs font-black px-2.5 py-1 rounded-full", p.paymentMethod === "CASH" ? "bg-emerald-500/10 text-emerald-600" : "bg-violet-500/10 text-violet-600")}>
                                        {p.paymentMethod === "CASH" ? "💵 Cash" : "📱 UPI"}
                                    </span>
                                    <span className="font-black text-foreground">₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(p.collectedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                                    {p.collectedBy?.name && ` · by ${p.collectedBy.name}`}
                                </p>
                                {p.remarks && <p className="text-xs text-muted-foreground mt-1 italic">"{p.remarks}"</p>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
    const { data: session } = useSession();
    const { activeWarehouse } = useWarehouse();

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [collectPayload, setCollectPayload] = useState<CollectBalancePayload | null>(null);
    const [historyVehicle, setHistoryVehicle] = useState<{ id: string; number: string } | null>(null);

    // Form State
    const [number, setNumber] = useState("");
    const [driver, setDriver] = useState("");

    const fetchVehicles = useCallback(async (tf: Timeframe) => {
        setLoading(true);
        try {
            const [salesRes, balanceRes] = await Promise.all([
                fetch(`/api/vehicles/sales-summary?timeframe=${tf}`),
                fetch(`/api/vehicles/balance`),
            ]);
            const salesData = salesRes.ok ? await salesRes.json() : { data: [] };
            const balanceData = balanceRes.ok ? await balanceRes.json() : { data: [] };

            // Merge balance data into vehicles
            const balanceMap: Record<string, { dailyBalance: number; totalOutstandingBalance: number }> = {};
            for (const b of (balanceData.data || [])) {
                balanceMap[b._id] = {
                    dailyBalance: b.dailyBalance || 0,
                    totalOutstandingBalance: b.totalOutstandingBalance || 0,
                };
            }

            const merged = (salesData.data || []).map((v: Vehicle) => ({
                ...v,
                ...(balanceMap[v._id] || { dailyBalance: 0, totalOutstandingBalance: 0 }),
            }));
            setVehicles(merged);
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
    const totalOutstanding = vehicles.reduce((sum, v) => sum + (v.totalOutstandingBalance || 0), 0);
    const topVehicle = vehicles[0]; // already sorted by sales desc

    const timeframeLabel: Record<Timeframe, string> = {
        weekly: "This Week",
        monthly: "This Month",
        all: "All Time",
    };

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-10">
            {/* Modals */}
            {collectPayload && (
                <CollectBalanceModal
                    payload={collectPayload}
                    onClose={() => setCollectPayload(null)}
                    onSuccess={() => fetchVehicles(timeframe)}
                />
            )}
            {historyVehicle && (
                <PaymentHistoryModal
                    vehicleId={historyVehicle.id}
                    vehicleNumber={historyVehicle.number}
                    onClose={() => setHistoryVehicle(null)}
                />
            )}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                    {/* Outstanding Balance Widget */}
                    <div className={clsx(
                        "border rounded-2xl p-5 flex items-center gap-4 shadow-sm",
                        totalOutstanding > 0 ? "bg-rose-500/5 border-rose-500/30" : "bg-card border-border"
                    )}>
                        <div className={clsx("p-3 rounded-xl", totalOutstanding > 0 ? "bg-rose-500/10" : "bg-emerald-500/10")}>
                            <Wallet className={clsx("w-6 h-6", totalOutstanding > 0 ? "text-rose-500" : "text-emerald-500")} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                                Fleet Outstanding
                            </p>
                            <p className={clsx("text-2xl font-black mt-0.5", totalOutstanding > 0 ? "text-rose-600" : "text-emerald-500")}>
                                {totalOutstanding > 0 ? formatCurrency(totalOutstanding) : "₹0"}
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
                                const hasBalance = (v.totalOutstandingBalance || 0) > 0.01;
                                const rankColors = ["text-amber-500", "text-slate-400", "text-orange-600"];
                                const isTopThree = rank < 3 && hasSales;

                                return (
                                    <div
                                        key={v._id}
                                        className={clsx(
                                            "bg-card p-5 rounded-2xl shadow-sm border transition-all group",
                                            hasBalance ? "border-rose-500/30 hover:border-rose-500/60 hover:shadow-rose-500/10 hover:shadow-md" : "border-border hover:shadow-md"
                                        )}
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

                                                    {/* ── Balance Amounts (between Vehicle Number and Sales) ── */}
                                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                        {/* Daily Balance */}
                                                        {(v.dailyBalance || 0) > 0.01 && (
                                                            <div className="flex items-center gap-1.5 bg-rose-500/8 border border-rose-500/20 rounded-lg px-2.5 py-1">
                                                                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                                                <div>
                                                                    <p className="text-[9px] font-black text-rose-500/70 uppercase tracking-wider leading-none">Daily Balance</p>
                                                                    <p className="text-xs font-black text-rose-600">₹{(v.dailyBalance || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Total Outstanding */}
                                                        <div className={clsx(
                                                            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 border",
                                                            hasBalance
                                                                ? "bg-rose-500/8 border-rose-500/20"
                                                                : "bg-emerald-500/8 border-emerald-500/20"
                                                        )}>
                                                            <Wallet className={clsx("w-3 h-3 shrink-0", hasBalance ? "text-rose-500" : "text-emerald-500")} />
                                                            <div>
                                                                <p className={clsx("text-[9px] font-black uppercase tracking-wider leading-none", hasBalance ? "text-rose-500/70" : "text-emerald-500/70")}>Outstanding</p>
                                                                <p className={clsx("text-xs font-black", hasBalance ? "text-rose-600" : "text-emerald-600")}>
                                                                    {hasBalance
                                                                        ? `₹${(v.totalOutstandingBalance || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                                                                        : "₹0 Paid"
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Sales Stats + Actions */}
                                            <div className="flex items-center gap-4 shrink-0">
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

                                                {/* Action buttons */}
                                                <div className="flex flex-col gap-1.5">
                                                    {/* Collect Balance button */}
                                                    {hasBalance && (
                                                        <button
                                                            onClick={() => setCollectPayload({
                                                                vehicleId: v._id,
                                                                vehicleNumber: v.number,
                                                                outstanding: v.totalOutstandingBalance || 0,
                                                            })}
                                                            title="Collect balance"
                                                            className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all border border-rose-500/20 active:scale-90"
                                                        >
                                                            <Wallet className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {/* Payment History */}
                                                    <button
                                                        onClick={() => setHistoryVehicle({ id: v._id, number: v.number })}
                                                        title="Payment history"
                                                        className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                                                    >
                                                        <Clock className="w-4 h-4" />
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(v._id, v.number)}
                                                        disabled={deletingId === v._id}
                                                        title="Delete vehicle"
                                                        className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 active:scale-90"
                                                    >
                                                        {deletingId === v._id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
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
