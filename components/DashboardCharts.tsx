"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Loader2, X, TrendingUp, ShoppingCart, Package, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { isoDateIST } from '@/lib/dateUtils';

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
    const [weekOffset, setWeekOffset] = useState<number>(0);
    const [selectedDate, setSelectedDate] = useState<string>(isoDateIST());
    const [data, setData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod | null>(null);
    const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Compute the visible week label for the current weekOffset relative to selectedDate
    const getWeekLabel = () => {
        if (weekOffset === 0) return "This Week";
        if (weekOffset === 1) return "Last Week";
        return `${weekOffset} Weeks Ago`;
    };

    useEffect(() => {
        async function fetchSales() {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    timeframe: "daily",
                    weekOffset: weekOffset.toString(),
                    date: selectedDate,
                });
                const res = await fetch(`/api/analytics/sales?${params}`);
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
    }, [selectedDate, weekOffset]);

    // Close modal when navigation changes
    useEffect(() => {
        setSelectedPeriod(null);
        setActiveBarIndex(null);
    }, [selectedDate, weekOffset]);

    const handleBarClick = useCallback(
        (barData: ChartDataPoint, index: number) => {
            if (!barData || barData.sales === 0) return;
            setActiveBarIndex(index);

            let startDate: string;
            let endDate: string;

            if (barData.fullDate) {
                startDate = barData.fullDate;
                endDate = barData.fullDate;
            } else {
                const today = isoDateIST();
                startDate = today;
                endDate = today;
            }

            setSelectedPeriod({
                label: barData.period,
                startDate,
                endDate,
            });
        },
        []
    );

    const handleCloseModal = useCallback(() => {
        setSelectedPeriod(null);
        setActiveBarIndex(null);
    }, []);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value);
        setWeekOffset(0); // Reset to current week of the selected date
    };

    return (
        <>
            <Card className="border-border/50 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
                    <div>
                        <CardTitle>Sales Overview</CardTitle>
                        <CardDescription>Invoiced sales volume · Click a bar for details</CardDescription>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        {/* Prev / Next Week Navigation */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setWeekOffset((prev) => Math.min(prev + 1, 12))}
                                disabled={weekOffset >= 12}
                                title="Previous week"
                                className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-foreground min-w-[80px] text-center">
                                {getWeekLabel()}
                            </span>
                            <button
                                onClick={() => setWeekOffset((prev) => Math.max(prev - 1, 0))}
                                disabled={weekOffset <= 0}
                                title="Next week"
                                className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Date Picker — same design as DashboardDateFilter */}
                        <div
                            className="flex items-center gap-2 bg-white dark:bg-muted px-4 py-2 rounded-xl border border-gray-200 dark:border-border shadow-sm hover:border-primary/40 transition-colors cursor-pointer"
                            onClick={() => dateInputRef.current?.showPicker?.()}
                        >
                            <Calendar className="w-4 h-4 text-gray-400 dark:text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-500 dark:text-muted-foreground hidden sm:inline">
                                Week of:
                            </span>
                            <input
                                ref={dateInputRef}
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="text-sm font-bold text-gray-900 dark:text-foreground bg-transparent border-none focus:ring-0 p-0 cursor-pointer w-[130px]"
                            />
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
