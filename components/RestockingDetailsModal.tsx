"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { DrillDownModal } from "./DrillDownModal";
import clsx from "clsx";

interface RestockItem {
    productName: string;
    packSize: string;
    quantity: number;
    invoiceCost: number;
    amount: number;
}

interface RestockRecord {
    date: string;
    invoiceNumber: string;
    enteredBy: string;
    totalProducts: number;
    totalAmount: number;
    items: RestockItem[];
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
    /** The exact total from the DailyAccountsCard — pinned to the footer */
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
            {[1, 2, 3, 4, 5].map((i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3.5 bg-muted rounded-md" style={{ width: `${60 + i * 8}%` }} />
                </td>
            ))}
        </tr>
    );
}

export function RestockingDetailsModal({ open, onClose, warehouseId, from, to, cardTotal }: Props) {
    const [records, setRecords]       = useState<RestockRecord[]>([]);
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
                const url = `/api/analytics/restocking-details?warehouseId=${encodeURIComponent(warehouseId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${pg}&limit=10&search=${encodeURIComponent(q)}`;
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

    // Fetch only when modal opens
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

    // Export CSV (all records — re-fetch page=1 limit=1000)
    const handleExport = async () => {
        try {
            const url = `/api/analytics/restocking-details?warehouseId=${encodeURIComponent(warehouseId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&limit=1000&search=${encodeURIComponent(search)}`;
            const res = await fetch(url);
            const data = await res.json();
            const allRecords: RestockRecord[] = data.records ?? [];

            const rows = [["Date", "Invoice Number", "Entered By", "Total Products", "Total Amount"]];
            for (const r of allRecords) {
                rows.push([fmtDate(r.date), r.invoiceNumber, r.enteredBy, String(r.totalProducts), String(r.totalAmount.toFixed(2))]);
                for (const item of r.items) {
                    rows.push(["", "", `  ${item.productName}`, `Qty: ${item.quantity}`, String(item.amount.toFixed(2))]);
                }
            }
            rows.push(["", "", "", "Total Restocking Price", cardTotal.toFixed(2)]);

            const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `restocking-details-${from}-to-${to}.csv`;
            a.click();
        } catch { /* silent */ }
    };

    const handlePrint = () => window.print();

    const controls = (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search invoice or entered by…"
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
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground print:hidden"
            >
                <Printer className="w-3.5 h-3.5" /> Print
            </button>
        </div>
    );

    const paginationEl = pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground text-xs">
                {pagination.totalRecords} record{pagination.totalRecords !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
                <button
                    disabled={page <= 1}
                    onClick={() => handlePage(page - 1)}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-semibold text-foreground">
                    {page} / {pagination.totalPages}
                </span>
                <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => handlePage(page + 1)}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    ) : null;

    const subtitle = `${fmtDate(from)} — ${fmtDate(to)}`;

    return (
        <DrillDownModal
            open={open}
            onClose={onClose}
            title="Restocking Details"
            subtitle={subtitle}
            footerLabel="Total Restocking Price"
            footerValue={INR(cardTotal)}
            controls={controls}
            pagination={paginationEl}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Invoice No.</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Entered By</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Products</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                        ) : error ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-destructive text-sm">{error}</td>
                            </tr>
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-16 text-center">
                                    <p className="text-muted-foreground font-medium">No restocking records found</p>
                                    <p className="text-muted-foreground/60 text-xs mt-1">Try adjusting the date range or search query</p>
                                </td>
                            </tr>
                        ) : (
                            records.map((rec, i) => {
                                const key = `${rec.invoiceNumber}-${i}`;
                                const isOpen = expanded.has(key);
                                return (
                                    <React.Fragment key={key}>
                                        <tr
                                            className={clsx(
                                                "border-b border-border/50 cursor-pointer transition-colors",
                                                isOpen ? "bg-primary/5" : "hover:bg-muted/50"
                                            )}
                                            onClick={() => toggleRow(key)}
                                        >
                                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{fmtDate(rec.date)}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{rec.invoiceNumber}</td>
                                            <td className="px-4 py-3 text-foreground">{rec.enteredBy}</td>
                                            <td className="px-4 py-3 text-right text-muted-foreground">{rec.totalProducts}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                <div className="flex items-center justify-end gap-2">
                                                    {INR(rec.totalAmount)}
                                                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                                </div>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr className="border-b border-border bg-muted/20">
                                                <td colSpan={5} className="px-6 py-0">
                                                    <div className="py-3">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="border-b border-border/50">
                                                                    <th className="pb-2 text-left font-semibold text-muted-foreground">Product</th>
                                                                    <th className="pb-2 text-left font-semibold text-muted-foreground">Pack</th>
                                                                    <th className="pb-2 text-right font-semibold text-muted-foreground">Qty</th>
                                                                    <th className="pb-2 text-right font-semibold text-muted-foreground">Invoice Cost</th>
                                                                    <th className="pb-2 text-right font-semibold text-muted-foreground">Line Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {rec.items.map((item, j) => (
                                                                    <tr key={j} className="border-b border-border/30 last:border-0">
                                                                        <td className="py-2 font-medium text-foreground">{item.productName}</td>
                                                                        <td className="py-2 text-muted-foreground">{item.packSize || "—"}</td>
                                                                        <td className="py-2 text-right text-foreground">{item.quantity}</td>
                                                                        <td className="py-2 text-right text-foreground">{INR(item.invoiceCost)}</td>
                                                                        <td className="py-2 text-right font-semibold text-primary">{INR(item.amount)}</td>
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
