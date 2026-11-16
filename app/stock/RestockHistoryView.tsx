"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, RotateCcw, Calendar, Warehouse as WarehouseIcon, Eye, Package, ChevronLeft, ChevronRight, Hash, Layers } from "lucide-react";
import RestockTransactionDetailsModal, { RestockTransactionDetail } from "./RestockTransactionDetailsModal";
import RestockExcelExportButton from "@/components/RestockExcelExportButton";

interface WarehouseOption {
    _id: string;
    name: string;
}

interface Props {
    userRole: string;
    warehouses: WarehouseOption[];
    initialWarehouseId?: string;
    warehouseName?: string;
}

interface SummaryData {
    totalTransactions: number;
    totalCases: number;
    totalBottles: number;
    grandTotal: number;
    totalProductsRestocked: number;
}

interface PaginationData {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
}

const formatCurrency = (amount: number = 0) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
};

function SkeletonRow() {
    return (
        <tr className="border-b border-border/50 animate-pulse">
            <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-28" /></td>
            <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-20" /></td>
            <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-16" /></td>
            <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-24" /></td>
            <td className="py-4 px-4 text-right"><div className="h-4 bg-muted rounded w-12 ml-auto" /></td>
            <td className="py-4 px-4 text-right"><div className="h-4 bg-muted rounded w-20 ml-auto" /></td>
            <td className="py-4 px-4 text-right"><div className="h-4 bg-muted rounded w-24 ml-auto" /></td>
            <td className="py-4 px-4 text-right"><div className="h-7 bg-muted rounded w-24 ml-auto" /></td>
        </tr>
    );
}

export default function RestockHistoryView({ userRole, warehouses, initialWarehouseId, warehouseName }: Props) {
    const isSuperAdmin = userRole === "SUPER_ADMIN";

    // Filter states
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>(initialWarehouseId || (isSuperAdmin ? "ALL" : warehouses[0]?._id || ""));
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");
    const [search, setSearch] = useState<string>("");
    const [searchInput, setSearchInput] = useState<string>("");
    const [page, setPage] = useState<number>(1);

    // Data states
    const [transactions, setTransactions] = useState<RestockTransactionDetail[]>([]);
    const [summary, setSummary] = useState<SummaryData>({
        totalTransactions: 0,
        totalCases: 0,
        totalBottles: 0,
        grandTotal: 0,
        totalProductsRestocked: 0,
    });
    const [pagination, setPagination] = useState<PaginationData>({
        page: 1,
        limit: 10,
        totalRecords: 0,
        totalPages: 0,
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Modal state
    const [activeTxn, setActiveTxn] = useState<RestockTransactionDetail | null>(null);
    const [modalOpen, setModalOpen] = useState<boolean>(false);

    // Debounce search
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const handleSearchChange = (val: string) => {
        setSearchInput(val);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setSearch(val.trim());
            setPage(1);
        }, 350);
    };

    const handleResetFilters = () => {
        setFrom("");
        setTo("");
        setSearch("");
        setSearchInput("");
        setSelectedWarehouse(initialWarehouseId || (isSuperAdmin ? "ALL" : warehouses[0]?._id || ""));
        setPage(1);
    };

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (selectedWarehouse && selectedWarehouse !== "ALL") {
                params.set("warehouseId", selectedWarehouse);
            } else if (selectedWarehouse === "ALL") {
                params.set("warehouseId", "ALL");
            }
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            if (search) params.set("search", search);
            params.set("page", String(page));
            params.set("limit", "10");

            const res = await fetch(`/api/restock-history?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to load restock history");
            }

            const data = await res.json();
            setTransactions(data.transactions || []);
            setSummary(data.summary || {
                totalTransactions: 0,
                totalCases: 0,
                totalBottles: 0,
                grandTotal: 0,
                totalProductsRestocked: 0,
            });
            setPagination(data.pagination || {
                page: 1,
                limit: 10,
                totalRecords: 0,
                totalPages: 0,
            });
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouse, from, to, search, page]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const openDetails = (txn: RestockTransactionDetail) => {
        setActiveTxn(txn);
        setModalOpen(true);
    };

    const currentWarehouseName = selectedWarehouse === "ALL"
        ? "All Authorized Warehouses"
        : warehouses.find((w) => w._id === selectedWarehouse)?.name || warehouseName || "Warehouse";

    return (
        <div className="space-y-6">
            {/* ── Summary Metric Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-erp-hover">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                        Total Transactions
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-foreground">
                            {summary.totalTransactions}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">Ops</span>
                    </div>
                </div>

                <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-erp-hover">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                        Total Quantity Restocked
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-teal-600">
                            {summary.totalCases}C {summary.totalBottles > 0 ? `+ ${summary.totalBottles}B` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">Cases &amp; Bottles</span>
                    </div>
                </div>

                <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-erp-hover">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                        Total Products Handled
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-foreground">
                            {summary.totalProductsRestocked}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">Items</span>
                    </div>
                </div>

                <div className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-erp-hover">
                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                        Total Invoice Amount
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-primary">
                            {formatCurrency(summary.grandTotal)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">Grand Total</span>
                    </div>
                </div>
            </div>

            {/* ── Filters & Action Bar ── */}
            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {/* Warehouse selector */}
                        <div className="min-w-[180px]">
                            <select
                                value={selectedWarehouse}
                                onChange={(e) => {
                                    setSelectedWarehouse(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                            >
                                {isSuperAdmin && <option value="ALL">All Warehouses</option>}
                                {warehouses.map((w) => (
                                    <option key={w._id} value={w._id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* From Date */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-[11px] uppercase">From:</span>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => {
                                    setFrom(e.target.value);
                                    setPage(1);
                                }}
                                className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none shadow-sm"
                            />
                        </div>

                        {/* To Date */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-[11px] uppercase">To:</span>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => {
                                    setTo(e.target.value);
                                    setPage(1);
                                }}
                                className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none shadow-sm"
                            />
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[220px] flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search product, flavour, pack, ID..."
                                value={searchInput}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="w-full text-xs font-medium pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none shadow-sm"
                            />
                        </div>

                        {/* Reset button */}
                        {(from || to || search || (isSuperAdmin && selectedWarehouse !== "ALL")) && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
                                title="Reset all filters"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>

                    {/* Excel Export Button */}
                    <div className="shrink-0">
                        <RestockExcelExportButton
                            filters={{
                                warehouseId: selectedWarehouse,
                                from,
                                to,
                                search,
                            }}
                            warehouseName={currentWarehouseName}
                        />
                    </div>
                </div>
            </div>

            {/* ── Transactions Table ── */}
            <div className="bg-card border rounded-2xl shadow-erp-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b text-xs uppercase font-bold text-muted-foreground">
                            <tr>
                                <th className="py-3 px-4 text-left">Transaction ID</th>
                                <th className="py-3 px-4 text-left">Date</th>
                                <th className="py-3 px-4 text-left">Time</th>
                                <th className="py-3 px-4 text-left">Warehouse</th>
                                <th className="py-3 px-4 text-right">Products</th>
                                <th className="py-3 px-4 text-right">Restocked Qty</th>
                                <th className="py-3 px-4 text-right">Invoice Amount</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-destructive text-sm font-semibold">
                                        {error}
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <p className="text-base font-bold text-foreground">No restock transactions found</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                            Completed restocking operations will automatically be recorded and displayed here with permanent price and quantity snapshots.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((txn) => (
                                    <tr key={txn._id} className="hover:bg-muted/40 transition-colors group">
                                        <td className="py-3.5 px-4 font-mono font-bold text-primary text-xs whitespace-nowrap">
                                            {txn.transactionId}
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                                            {formatDate(txn.restockDate)}
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                                            {txn.restockTime || "—"}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground max-w-[160px] truncate">
                                                <WarehouseIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                                                <span className="truncate">{txn.warehouseName}</span>
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-medium text-muted-foreground">
                                            {txn.totalProducts} {txn.totalProducts === 1 ? "item" : "items"}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-bold text-teal-600 whitespace-nowrap">
                                            {txn.totalCases}C {txn.totalBottles > 0 ? `+ ${txn.totalBottles}B` : ""}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-black text-foreground whitespace-nowrap">
                                            {formatCurrency(txn.grandTotal)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => openDetails(txn)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all shadow-sm"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="p-4 bg-muted/30 border-t flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div>
                            Showing page <span className="font-bold text-foreground">{pagination.page}</span> of{" "}
                            <span className="font-bold text-foreground">{pagination.totalPages}</span> ({pagination.totalRecords} records)
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                            </button>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Transaction Details Modal ── */}
            <RestockTransactionDetailsModal
                transaction={activeTxn}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
}

