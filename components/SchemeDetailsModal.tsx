"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { DrillDownModal } from "./DrillDownModal";
import clsx from "clsx";

interface SchemeItem {
    productName: string;
    schemeType: string;
    packs: number;
    discountPerPack: number;
    amount: number;
}

interface SchemeRecord {
    date: string;
    vehicleNumber: string;
    driverName: string;
    totalSchemeValue: number;
    items: SchemeItem[];
}

interface Pagination {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    warehouseId: string;
    from: string;
    to: string;
    cardTotal: number;
}

const INR = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v);

const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
};

function SkeletonRow() {
    return (
        <tr className="border-b border-border/50 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3.5 bg-muted rounded-md" style={{ width: `${55 + i * 10}%` }} />
                </td>
            ))}
        </tr>
    );
}

export function SchemeDetailsModal({ open, onClose, warehouseId, from, to, cardTotal }: Props) {
    const [records, setRecords]       = useState<SchemeRecord[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState("");
    const [search, setSearch]         = useState("");
    const [expanded, setExpanded]     = useState<Set<string>>(new Set());
    const [page, setPage]             = useState(1);
    const debounceRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchData = useCallback(
        async (pg: number, q: string) => {
            if (!warehouseId || !from || !to) return;
            setLoading(true);
            setError("");
            try {
                const url = `/api/analytics/scheme-details?warehouseId=${encodeURIComponent(warehouseId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${pg}&limit=10&search=${encodeURIComponent(q)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setRecords(data.records ?? []);
                setPagination(data.pagination ?? { page: pg, limit: 10, totalRecords: 0, totalPages: 0 });
            } catch (e: any) {
                setError(e.message || "Failed to load");
            } finally {
                setLoading(false);
            }
        },
        [warehouseId, from, to]
    );

    useEffect(() => {
        if (open) {
            setPage(1);
            setSearch("");
            setExpanded(new Set());
            fetchData(1, "");
        }
    }, [open, fetchData]);

    const handleSearch = (q: string) => {
        setSearch(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            fetchData(1, q);
        }, 350);
    };

    const handlePage = (p: number) => {
        setPage(p);
        fetchData(p, search);
    };

    const toggleRow = (key: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });

    const handleExport = async () => {
        try {
            const url = `/api/analytics/scheme-details?warehouseId=${encodeURIComponent(warehouseId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&limit=1000&search=${encodeURIComponent(search)}`;
            const res  = await fetch(url);
            const data = await res.json();
            const allRecords: SchemeRecord[] = data.records ?? [];

            const rows = [["Date", "Vehicle", "Driver", "Scheme Value"]];
            for (const r of allRecords) {
                rows.push([fmtDate(r.date), r.vehicleNumber, r.driverName, r.totalSchemeValue.toFixed(2)]);
                for (const item of r.items) {
                    rows.push(["", "", `  ${item.productName} (${item.schemeType})`, item.amount.toFixed(2)]);
                }
            }
            rows.push(["", "", "Total Scheme Value", cardTotal.toFixed(2)]);

            const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a    = document.createElement("a");
            a.href     = URL.createObjectURL(blob);
            a.download = `scheme-details-${from}-to-${to}.csv`;
            a.click();
        } catch { /* silent */ }
    };

    const controls = (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search vehicle or driver…"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
                <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground print:hidden"
            >
                <Printer className="w-3.5 h-3.5" /> Print
            </button>
        </div>
    );

    const paginationEl = pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground text-xs">{pagination.totalRecords} trip{pagination.totalRecords !== 1 ? "s" : ""} with scheme</span>
            <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => handlePage(page - 1)} className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-3 py-1 text-xs font-semibold text-foreground">{page} / {pagination.totalPages}</span>
                <button disabled={page >= pagination.totalPages} onClick={() => handlePage(page + 1)} className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
        </div>
    ) : null;

    const subtitle = `${fmtDate(from)} — ${fmtDate(to)}`;

    return (
        <DrillDownModal
            open={open}
            onClose={onClose}
            title="Vehicle Scheme Details"
            subtitle={subtitle}
            footerLabel="Total Scheme Value"
            footerValue={INR(cardTotal)}
            controls={controls}
            pagination={paginationEl}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Vehicle</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Driver</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Scheme Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                        ) : error ? (
                            <tr><td colSpan={4} className="px-4 py-12 text-center text-destructive text-sm">{error}</td></tr>
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-16 text-center">
                                    <p className="text-muted-foreground font-medium">No scheme records found</p>
                                    <p className="text-muted-foreground/60 text-xs mt-1">Try adjusting the date range or search query</p>
                                </td>
                            </tr>
                        ) : (
                            records.map((rec, i) => {
                                const key    = `${rec.vehicleNumber}-${rec.date}-${i}`;
                                const isOpen = expanded.has(key);
                                return (
                                    <React.Fragment key={key}>
                                        <tr
                                            className={clsx("border-b border-border/50 cursor-pointer transition-colors", isOpen ? "bg-purple-500/5" : "hover:bg-muted/50")}
                                            onClick={() => toggleRow(key)}
                                        >
                                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{fmtDate(rec.date)}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{rec.vehicleNumber}</span>
                                            </td>
                                            <td className="px-4 py-3 text-foreground">{rec.driverName}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                                                <div className="flex items-center justify-end gap-2">
                                                    {INR(rec.totalSchemeValue)}
                                                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                                </div>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr className="border-b border-border bg-muted/20">
                                                <td colSpan={4} className="px-6 py-0">
                                                    <div className="py-3">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="border-b border-border/50">
                                                                    <th className="pb-2 text-left font-semibold text-muted-foreground">Product</th>
                                                                    <th className="pb-2 text-left font-semibold text-muted-foreground">Scheme Type</th>
                                                                    <th className="pb-2 text-right font-semibold text-muted-foreground">Packs</th>
                                                                    <th className="pb-2 text-right font-semibold text-muted-foreground">Discount/Pack</th>
                                                                    <th className="pb-2 text-right font-semibold text-muted-foreground">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {rec.items.map((item, j) => (
                                                                    <tr key={j} className="border-b border-border/30 last:border-0">
                                                                        <td className="py-2 font-medium text-foreground">{item.productName}</td>
                                                                        <td className="py-2">
                                                                            <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide", item.schemeType === "Free Items" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400")}>
                                                                                {item.schemeType}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2 text-right text-foreground">{item.packs}</td>
                                                                        <td className="py-2 text-right text-foreground">{INR(item.discountPerPack)}</td>
                                                                        <td className="py-2 text-right font-semibold text-purple-600 dark:text-purple-400">{INR(item.amount)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </DrillDownModal>
    );
}
