"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Truck, Package, Calendar, Loader2, TrendingUp, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { formatIST, isoDateIST } from "@/lib/dateUtils";
import { useWarehouse } from "@/components/WarehouseContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SaleItem {
    productId: string;
    name: string;
    flavour: string;
    pack: string;
    bottlesPerPack: number;
    salePrice: number;
    soldQty: number;
    salesAmount: number;
}

interface DaySales {
    date: string;
    items: SaleItem[];
}

interface VehicleData {
    _id: string;
    number: string;
    driverName: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "₹0";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
};

// ── Date Picker component (matches DashboardDateFilter design) ─────────────────

function DatePickerInput({
    label,
    value,
    onChange,
    max,
    min,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    max?: string;
    min?: string;
    placeholder?: string;
}) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div
            className="flex items-center gap-2 bg-white dark:bg-muted px-3 py-2 rounded-xl border border-gray-200 dark:border-border shadow-sm hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => ref.current?.showPicker?.()}
        >
            <Calendar className="w-4 h-4 text-gray-400 dark:text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-500 dark:text-muted-foreground hidden sm:inline whitespace-nowrap">
                {label}
            </span>
            <input
                ref={ref}
                type="date"
                value={value}
                min={min}
                max={max}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="text-sm font-bold text-gray-900 dark:text-foreground bg-transparent border-none focus:ring-0 p-0 cursor-pointer w-[130px]"
            />
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VehicleDetailsPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const { activeWarehouse } = useWarehouse();

    const [vehicle, setVehicle] = useState<VehicleData | null>(null);
    const [sales, setSales] = useState<DaySales[]>([]);
    const [loading, setLoading] = useState(true);

    // Date range state — empty string means "no filter" (show all)
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    // Whether a filter is currently active
    const isFiltered = !!(fromDate || toDate);

    const fetchSales = useCallback(
        async (from: string, to: string) => {
            setLoading(true);
            try {
                const q = new URLSearchParams();
                if (from) q.set("fromDate", from);
                if (to) q.set("toDate", to);
                const url = `/api/vehicles/${id}/sales${q.toString() ? `?${q}` : ""}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setVehicle(data.vehicle);
                    setSales(data.sales || []);
                } else {
                    setVehicle(null);
                    setSales([]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        },
        [id, activeWarehouse?.id]
    );

    useEffect(() => {
        fetchSales(fromDate, toDate);
    }, [fromDate, toDate, fetchSales, activeWarehouse?.id]);

    const handleClear = () => {
        setFromDate("");
        setToDate("");
    };

    // Guard: if toDate is set before fromDate, keep toDate ≥ fromDate
    const handleFromChange = (v: string) => {
        setFromDate(v);
        if (toDate && v && v > toDate) setToDate(v);
    };

    const handleToChange = (v: string) => {
        setToDate(v);
        if (fromDate && v && v < fromDate) setFromDate(v);
    };

    // Overall totals for the selected period
    const periodTotalSales = sales.reduce(
        (sum, day) => sum + day.items.reduce((s, item) => s + item.salesAmount, 0),
        0
    );
    const periodTotalBottles = sales.reduce(
        (sum, day) => sum + day.items.reduce((s, item) => s + item.soldQty, 0),
        0
    );

    // Friendly date range label for the stats banner
    const rangeLabel = (() => {
        if (!isFiltered) return "All Time";
        if (fromDate && toDate) {
            if (fromDate === toDate)
                return formatIST(fromDate, { day: "numeric", month: "short", year: "numeric" });
            return `${formatIST(fromDate, { day: "numeric", month: "short" })} – ${formatIST(toDate, { day: "numeric", month: "short", year: "numeric" })}`;
        }
        if (fromDate) return `From ${formatIST(fromDate, { day: "numeric", month: "short", year: "numeric" })}`;
        return `Until ${formatIST(toDate, { day: "numeric", month: "short", year: "numeric" })}`;
    })();

    const today = isoDateIST();

    if (!loading && !vehicle) {
        return (
            <div className="max-w-[1200px] mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold">Vehicle not found</h1>
                <Link href="/vehicles" className="text-primary hover:underline mt-4 inline-block">
                    Back to Vehicles
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-10">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 bg-card/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border shadow-sm">
                {/* Top row: back button + vehicle info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Link
                        href="/vehicles"
                        className="p-2 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex-1 min-w-0">
                        {loading && !vehicle ? (
                            <div className="h-8 w-40 bg-muted animate-pulse rounded-lg" />
                        ) : (
                            <>
                                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                    <Truck className="w-7 h-7 text-primary shrink-0" />
                                    {vehicle?.number}
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Driver:{" "}
                                    <span className="font-bold text-foreground">{vehicle?.driverName}</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Bottom row: Date range picker */}
                <div className="flex flex-wrap items-center gap-3">
                    <DatePickerInput
                        label="From:"
                        value={fromDate}
                        onChange={handleFromChange}
                        max={toDate || today}
                    />

                    <span className="text-sm font-bold text-muted-foreground">—</span>

                    <DatePickerInput
                        label="To:"
                        value={toDate}
                        onChange={handleToChange}
                        min={fromDate || undefined}
                        max={today}
                    />

                    {isFiltered && (
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive border border-border hover:border-destructive/30 transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}

                    {!isFiltered && (
                        <span className="text-xs font-medium text-muted-foreground italic">
                            Showing all records · select dates to filter
                        </span>
                    )}
                </div>
            </div>

            {/* ── Period Summary Banner ───────────────────────────────────── */}
            {!loading && sales.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                {rangeLabel} Sales
                            </p>
                            <p className="text-xl font-black text-emerald-500">{formatCurrency(periodTotalSales)}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl">
                            <Package className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                Total Bottles
                            </p>
                            <p className="text-xl font-black text-foreground">
                                {periodTotalBottles.toLocaleString("en-IN")}
                            </p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm col-span-2 sm:col-span-1">
                        <div className="p-2.5 bg-amber-500/10 rounded-xl">
                            <Calendar className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                Active Days
                            </p>
                            <p className="text-xl font-black text-foreground">{sales.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sales Data ─────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-9 h-9 animate-spin text-primary" />
                </div>
            ) : sales.length === 0 ? (
                <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border">
                    <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium text-lg">
                        No verified sales found
                        {isFiltered ? ` for ${rangeLabel}.` : "."}
                    </p>
                    {isFiltered && (
                        <button
                            onClick={handleClear}
                            className="mt-4 text-sm text-primary hover:underline font-semibold"
                        >
                            Clear filter to view all records →
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {sales.map((day) => {
                        const totalSalesAmount = day.items.reduce((sum, item) => sum + item.salesAmount, 0);
                        return (
                            <Card key={day.date} className="border shadow-sm overflow-hidden bg-card">
                                <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between flex-wrap gap-3">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-primary" />
                                        {formatIST(day.date, {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </CardTitle>
                                    <div className="text-lg font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                                        Total: {formatCurrency(totalSalesAmount)}
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table className="min-w-[800px]">
                                            <TableHeader className="bg-muted/10">
                                                <TableRow>
                                                    <TableHead className="font-bold">Pack</TableHead>
                                                    <TableHead className="font-bold">Flavour</TableHead>
                                                    <TableHead className="font-bold text-right">Sale Price</TableHead>
                                                    <TableHead className="font-bold text-right">Sold Qty (Packs)</TableHead>
                                                    <TableHead className="font-bold text-right">Sold Qty (Bottles)</TableHead>
                                                    <TableHead className="font-bold text-right">Sales Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {day.items.map((item, idx) => (
                                                    <TableRow
                                                        key={idx}
                                                        className="hover:bg-muted/50 transition-colors"
                                                    >
                                                        <TableCell className="font-medium text-foreground">
                                                            {item.pack}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-foreground">
                                                            {item.flavour}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground font-medium">
                                                            {formatCurrency(item.salePrice)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-foreground font-bold">
                                                            {item.bottlesPerPack
                                                                ? Math.floor(item.soldQty / item.bottlesPerPack)
                                                                : 0}
                                                        </TableCell>
                                                        <TableCell className="text-right text-foreground font-bold">
                                                            {item.soldQty}
                                                        </TableCell>
                                                        <TableCell className="text-right text-primary font-bold">
                                                            {formatCurrency(item.salesAmount)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter className="bg-muted border-t-2 border-border font-bold text-foreground">
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-right">
                                                        Daily Total:
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {day.items.reduce(
                                                            (sum, item) =>
                                                                sum +
                                                                (item.bottlesPerPack
                                                                    ? Math.floor(item.soldQty / item.bottlesPerPack)
                                                                    : 0),
                                                            0
                                                        )}{" "}
                                                        packs
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {day.items.reduce((sum, item) => sum + item.soldQty, 0)} bottles
                                                    </TableCell>
                                                    <TableCell className="text-right text-primary text-lg">
                                                        {formatCurrency(totalSalesAmount)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
