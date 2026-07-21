"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Download, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { DrillDownModal } from "./DrillDownModal";

interface PaymentRecord {
    date: string;
    enteredBy: string;
    remarks: string;
    amount: number;
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
                    <div className="h-3.5 bg-muted rounded-md" style={{ width: `${50 + i * 12}%` }} />
                </td>
            ))}
        </tr>
    );
}

export function PaymentDetailsModal({ open, onClose, warehouseId, from, to, cardTotal }: Props) {
    const [records, setRecords]       = useState<PaymentRecord[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState("");
    const [search, setSearch]         = useState("");
    const [page, setPage]             = useState(1);
    const debounceRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchData = useCallback(
        async (pg: number, q: string) => {
            if (!warehouseId || !from || !to) return;
            setLoading(true);
            setError("");
            try {
                const url = `/api/analytics/payment-details?warehouseId=${encodeURIComponent(warehouseId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${pg}&limit=10&search=${encodeURIComponent(q)}`;
                const res  = await fetch(url);
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

    const handleExport = async () => {
        try {
            const url  = `/api/analytics/payment-details?warehouseId=${encodeURIComponent(warehouseId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&limit=1000&search=${encodeURIComponent(search)}`;
            const res  = await fetch(url);
            const data = await res.json();
            const all: PaymentRecord[] = data.records ?? [];
            const rows = [["Date", "Entered By", "Remarks", "Amount"]];
            for (const r of all) rows.push([fmtDate(r.date), r.enteredBy, r.remarks, r.amount.toFixed(2)]);
            rows.push(["", "", "Total Amount Paid", cardTotal.toFixed(2)]);
            const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a    = document.createElement("a");
            a.href     = URL.createObjectURL(blob);
            a.download = `payment-details-${from}-to-${to}.csv`;
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
                    placeholder="Search entered by or remarks…"
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
            <span className="text-muted-foreground text-xs">{pagination.totalRecords} entr{pagination.totalRecords !== 1 ? "ies" : "y"}</span>
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
            title="Amount Paid Details"
            subtitle={subtitle}
            footerLabel="Total Amount Paid"
            footerValue={INR(cardTotal)}
            controls={controls}
            pagination={paginationEl}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Entered By</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Remarks</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Amount</th>
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
                                    <p className="text-muted-foreground font-medium">No payment records found</p>
                                    <p className="text-muted-foreground/60 text-xs mt-1">Try adjusting the date range or search query</p>
                                </td>
                            </tr>
                        ) : (
                            records.map((rec, i) => (
                                <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{fmtDate(rec.date)}</td>
                                    <td className="px-4 py-3 text-foreground">{rec.enteredBy}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{rec.remarks || <span className="italic text-muted-foreground/50">—</span>}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">{INR(rec.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </DrillDownModal>
    );
}
