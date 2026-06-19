"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Loader2, X, TrendingUp, ShoppingCart, Package } from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartDataPoint {
    period: string;
    sales: number;
    fullDate?: string;           // for daily
    weekStart?: string;          // for weekly
    weekEnd?: string;            // for weekly
    monthKey?: string;           // for monthly
}

interface ProductDetail {
    name: string;
    pack: string;
    flavour: string;
    bottlesPerPack: number;
    totalBottles: number;
    packs: number;
    extraBottles: number;
    totalRevenue: number;
}

interface SalesDetails {
    totalSales: number;
    billCount: number;
    products: ProductDetail[];
}

interface SelectedPeriod {
    label: string;
    startDate: string;
    endDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null) return "₹0";
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
};

const formatCurrencyFull = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border border-border p-3 rounded-lg shadow-md">
                <p className="font-bold text-foreground mb-1">{label}</p>
                <p className="text-emerald-500 font-medium">
                    Sales:{" "}
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(payload[0].value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Click bar for breakdown →</p>
            </div>
        );
    }
    return null;
};

// ─── Drill-Down Modal ─────────────────────────────────────────────────────────

function SalesDetailModal({
    period,
    onClose,
}: {
    period: SelectedPeriod;
    onClose: () => void;
}) {
    const [details, setDetails] = useState<SalesDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchDetails() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/analytics/sales/details?startDate=${period.startDate}&endDate=${period.endDate}`
                );
                if (!res.ok) throw new Error("Failed to fetch");
                const data: SalesDetails = await res.json();
                if (!cancelled) setDetails(data);
            } catch {
                if (!cancelled) setError("Could not load sales details. Please try again.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchDetails();
        return () => { cancelled = true; };
    }, [period.startDate, period.endDate]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
                style={{ animation: "slideUp 0.2s ease-out" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Sales Breakdown</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{period.label}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <p className="text-sm text-muted-foreground">Loading sales details…</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="flex items-center justify-center py-16 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    {!loading && !error && details && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Total Sales</p>
                                        <p className="text-lg font-bold text-emerald-500">
                                            {formatCurrencyFull(details.totalSales)}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <ShoppingCart className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Bills Raised</p>
                                        <p className="text-lg font-bold text-foreground">{details.billCount}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Products Table */}
                            {details.products.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                                    <Package className="w-10 h-10 opacity-40" />
                                    <p className="text-sm">No products sold in this period.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                        Product Breakdown ({details.products.length} SKUs)
                                    </p>
                                    <div className="border border-border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-muted/50 text-muted-foreground">
                                                    <th className="text-left p-3 font-semibold">Product</th>
                                                    <th className="text-right p-3 font-semibold">Bottles</th>
                                                    <th className="text-right p-3 font-semibold">Packs</th>
                                                    <th className="text-right p-3 font-semibold">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {details.products.map((p, i) => (
                                                    <tr
                                                        key={i}
                                                        className={clsx(
                                                            "border-t border-border transition-colors hover:bg-muted/30",
                                                            i % 2 === 0 ? "" : "bg-muted/10"
                                                        )}
                                                    >
                                                        <td className="p-3">
                                                            <p className="font-semibold text-foreground leading-tight">{p.name}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {p.pack}
                                                                {p.flavour && p.flavour !== "-" ? ` · ${p.flavour}` : ""}
                                                            </p>
                                                        </td>
                                                        <td className="p-3 text-right font-medium text-foreground">
                                                            {p.totalBottles.toLocaleString("en-IN")}
                                                        </td>
                                                        <td className="p-3 text-right text-muted-foreground">
                                                            {p.packs > 0 ? p.packs : "—"}
                                                            {p.extraBottles > 0 ? (
                                                                <span className="text-xs ml-1">(+{p.extraBottles})</span>
                                                            ) : null}
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-emerald-500">
                                                            {formatCurrencyFull(p.totalRevenue)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-border bg-muted/30">
                                                    <td className="p-3 font-bold text-foreground" colSpan={3}>
                                                        Total
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-emerald-500 text-base">
                                                        {formatCurrencyFull(details.totalSales)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
            `}</style>
        </div>
    );
}

// ─── Main Chart Component ─────────────────────────────────────────────────────

export function DashboardStockChart() {
    const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
    const [weekOffset, setWeekOffset] = useState<number>(0);
    const [data, setData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod | null>(null);
    const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

    useEffect(() => {
        async function fetchSales() {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/analytics/sales?timeframe=${timeframe}&weekOffset=${weekOffset}`
                );
                if (res.ok) {
                    const json = await res.json();
                    setData(json.data || []);
                }
            } catch (error) {
                console.error("Failed to fetch sales data", error);
            } finally {
                setLoading(false);
            }
        }
        fetchSales();
    }, [timeframe, weekOffset]);

    // When the timeframe changes, close any open modal
    useEffect(() => {
        setSelectedPeriod(null);
        setActiveBarIndex(null);
    }, [timeframe, weekOffset]);

    const handleBarClick = useCallback(
        (barData: ChartDataPoint, index: number) => {
            if (!barData || barData.sales === 0) return;
            setActiveBarIndex(index);

            let startDate: string;
            let endDate: string;

            if (timeframe === "daily" && barData.fullDate) {
                startDate = barData.fullDate;
                endDate = barData.fullDate;
            } else if (timeframe === "weekly" && barData.weekStart && barData.weekEnd) {
                startDate = barData.weekStart;
                endDate = barData.weekEnd;
            } else if (timeframe === "monthly" && barData.monthKey) {
                // monthKey is "YYYY-MM" — compute first and last day
                const [year, month] = barData.monthKey.split("-").map(Number);
                const firstDay = new Date(year, month - 1, 1);
                const lastDay = new Date(year, month, 0);
                startDate = firstDay.toISOString().split("T")[0];
                endDate = lastDay.toISOString().split("T")[0];
            } else {
                // Fallback: use period label as-is — best effort
                const today = new Date().toISOString().split("T")[0];
                startDate = today;
                endDate = today;
            }

            setSelectedPeriod({
                label: barData.period,
                startDate,
                endDate,
            });
        },
        [timeframe]
    );

    const handleCloseModal = useCallback(() => {
        setSelectedPeriod(null);
        setActiveBarIndex(null);
    }, []);

    return (
        <>
            <Card className="border-border/50 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
                    <div>
                        <CardTitle>Sales Overview</CardTitle>
                        <CardDescription>Invoiced sales volume over time · Click a bar for details</CardDescription>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                        {timeframe === "daily" && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setWeekOffset((prev) => Math.min(prev + 1, 3))}
                                    disabled={weekOffset >= 3}
                                    className="px-2 py-1 text-xs font-bold rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Prev Week
                                </button>
                                <span className="text-xs font-bold text-foreground min-w-[70px] text-center">
                                    {weekOffset === 0
                                        ? "This Week"
                                        : weekOffset === 1
                                        ? "Last Week"
                                        : `${weekOffset} Weeks Ago`}
                                </span>
                                <button
                                    onClick={() => setWeekOffset((prev) => Math.max(prev - 1, 0))}
                                    disabled={weekOffset <= 0}
                                    className="px-2 py-1 text-xs font-bold rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next Week →
                                </button>
                            </div>
                        )}

                        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
                            {(["daily", "weekly", "monthly"] as const).map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={clsx(
                                        "px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize",
                                        timeframe === tf
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="h-[250px] w-full relative">
                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-lg">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        )}

                        {data.length === 0 && !loading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No sales data found for this period.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    style={{ cursor: "pointer" }}
                                >
                                    <XAxis
                                        dataKey="period"
                                        axisLine={false}
                                        tickLine={false}
                                        className="text-xs font-medium"
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        className="text-xs font-medium"
                                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                                        width={50}
                                        tickFormatter={formatCurrency}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                                    />
                                    <Bar
                                        dataKey="sales"
                                        radius={[4, 4, 0, 0]}
                                        onClick={(barData, index) => handleBarClick(barData as unknown as ChartDataPoint, index)}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    activeBarIndex === index
                                                        ? "#16a34a"   // darker green when selected
                                                        : "#22c55e"
                                                }
                                                fillOpacity={
                                                    activeBarIndex !== null && activeBarIndex !== index
                                                        ? 0.4         // dim other bars
                                                        : 0.85
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedPeriod && (
                <SalesDetailModal period={selectedPeriod} onClose={handleCloseModal} />
            )}
        </>
    );
}
