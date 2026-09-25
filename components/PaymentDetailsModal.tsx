"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Search, Download, ChevronLeft, ChevronRight, Printer,
    Pencil, Trash2, X, AlertTriangle, Check, Loader2,
} from "lucide-react";
import { DrillDownModal } from "./DrillDownModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentRecord {
    _id: string;
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
    /** Called when a record is edited or deleted so the parent can refresh the total. */
    onMutated?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INR = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v);

const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-border/50 animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3.5 bg-muted rounded-md" style={{ width: `${50 + i * 12}%` }} />
                </td>
            ))}
        </tr>
    );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
    record: PaymentRecord | null;
    onClose: () => void;
    onSaved: (updated: PaymentRecord) => void;
}

function EditPaymentModal({ record, onClose, onSaved }: EditModalProps) {
    const [date, setDate]     = useState("");
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState("");

    useEffect(() => {
        if (record) {
            setDate(record.date);
            setAmount(record.amount.toString());
            setError("");
        }
    }, [record]);

    if (!record) return null;

    const handleSave = async () => {
        setError("");
        const parsedAmount = parseFloat(amount);
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            setError("Please enter a valid date (YYYY-MM-DD).");
            return;
        }
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError("Amount must be a positive number.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/analytics/daily-payment/${record._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, amount: parsedAmount }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || `Error ${res.status}`);
                return;
            }
            onSaved({ ...record, date, amount: parsedAmount });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to update payment.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">Edit Payment Entry</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close edit modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount (₹)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
                        <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-border bg-muted pl-8 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                            : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

interface DeleteModalProps {
    record: PaymentRecord | null;
    onClose: () => void;
    onDeleted: (id: string) => void;
}

function DeletePaymentModal({ record, onClose, onDeleted }: DeleteModalProps) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError]       = useState("");

    useEffect(() => {
        if (record) setError("");
    }, [record]);

    if (!record) return null;

    const handleDelete = async () => {
        setError("");
        setDeleting(true);
        try {
            const res = await fetch(`/api/analytics/daily-payment/${record._id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || `Error ${res.status}`);
                return;
            }
            onDeleted(record._id);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to delete payment.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                        <Trash2 className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">Delete Payment Entry</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
                    </div>
                </div>

                <div className="rounded-xl bg-muted/60 border border-border/60 px-4 py-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium text-foreground">{fmtDate(record.date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{INR(record.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Entered By</span>
                        <span className="font-medium text-foreground">{record.enteredBy}</span>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        disabled={deleting}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {deleting
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                            : <><Trash2 className="w-3.5 h-3.5" /> Delete</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function PaymentDetailsModal({ open, onClose, warehouseId, from, to, cardTotal, onMutated }: Props) {
    const [records, setRecords]           = useState<PaymentRecord[]>([]);
    const [pagination, setPagination]     = useState<Pagination>({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState("");
    const [search, setSearch]             = useState("");
    const [page, setPage]                 = useState(1);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const debounceRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [toast, setToast]         = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [editTarget, setEditTarget]     = useState<PaymentRecord | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);

    const showToast = (type: "success" | "error", msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

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
                // isSuperAdmin comes from the server — never trust a client-only session value
                setIsSuperAdmin(data.isSuperAdmin === true);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Failed to load");
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

    const handleEditSaved = (updated: PaymentRecord) => {
        setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
        setEditTarget(null);
        showToast("success", "Payment entry updated successfully.");
        onMutated?.();
    };

    const handleDeleted = (id: string) => {
        setRecords((prev) => prev.filter((r) => r._id !== id));
        setPagination((prev) => ({ ...prev, totalRecords: Math.max(0, prev.totalRecords - 1) }));
        setDeleteTarget(null);
        showToast("success", "Payment entry deleted successfully.");
        onMutated?.();
    };

    const colCount = isSuperAdmin ? 5 : 4;

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
            <span className="text-muted-foreground text-xs">
                {pagination.totalRecords} entr{pagination.totalRecords !== 1 ? "ies" : "y"}
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
        <>
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
                {/* Toast notification */}
                {toast && (
                    <div
                        className={`mx-4 mt-3 mb-1 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm ${
                            toast.type === "success"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-destructive/15 text-destructive border border-destructive/20"
                        }`}
                    >
                        {toast.type === "success"
                            ? <Check className="w-4 h-4 flex-shrink-0" />
                            : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                        {toast.msg}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                            <tr className="border-b border-border">
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Entered By</th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Remarks</th>
                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Amount</th>
                                {isSuperAdmin && (
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={colCount} />)
                            ) : error ? (
                                <tr>
                                    <td colSpan={colCount} className="px-4 py-12 text-center text-destructive text-sm">{error}</td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={colCount} className="px-4 py-16 text-center">
                                        <p className="text-muted-foreground font-medium">No payment records found</p>
                                        <p className="text-muted-foreground/60 text-xs mt-1">Try adjusting the date range or search query</p>
                                    </td>
                                </tr>
                            ) : (
                                records.map((rec) => (
                                    <tr key={rec._id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{fmtDate(rec.date)}</td>
                                        <td className="px-4 py-3 text-foreground">{rec.enteredBy}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{rec.remarks || <span className="italic text-muted-foreground/50">—</span>}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">{INR(rec.amount)}</td>
                                        {isSuperAdmin && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setEditTarget(rec)}
                                                        title="Edit payment entry"
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(rec)}
                                                        title="Delete payment entry"
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </DrillDownModal>

            {/* Sub-modals — rendered outside DrillDownModal to avoid stacking context issues */}
            {isSuperAdmin && (
                <>
                    <EditPaymentModal
                        record={editTarget}
                        onClose={() => setEditTarget(null)}
                        onSaved={handleEditSaved}
                    />
                    <DeletePaymentModal
                        record={deleteTarget}
                        onClose={() => setDeleteTarget(null)}
                        onDeleted={handleDeleted}
                    />
                </>
            )}
        </>
    );
}
