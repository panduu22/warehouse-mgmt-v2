"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";

interface RestockExcelExportButtonProps {
    filters: {
        warehouseId?: string;
        from?: string;
        to?: string;
        search?: string;
    };
    warehouseName?: string;
}

export default function RestockExcelExportButton({ filters, warehouseName }: RestockExcelExportButtonProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        setLoading(true);
        setSuccess(false);
        setError(null);

        try {
            // Build query params requesting all records for export (up to 10,000)
            const params = new URLSearchParams();
            if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
            if (filters.from) params.set("from", filters.from);
            if (filters.to) params.set("to", filters.to);
            if (filters.search) params.set("search", filters.search);
            params.set("page", "1");
            params.set("limit", "10000");

            const res = await fetch(`/api/restock-history?${params.toString()}`);
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error || "Failed to fetch restock history for export");
            }

            const data = await res.json();
            const transactions: any[] = data.transactions || [];

            if (transactions.length === 0) {
                setError("No restock transactions match the current filters.");
                setLoading(false);
                return;
            }

            // Dynamically import xlsx
            const XLSX = await import("xlsx");

            // Build rows
            const rows: any[][] = [
                [
                    "Transaction ID",
                    "Date",
                    "Time",
                    "Warehouse",
                    "Product Name",
                    "Cases Restocked",
                    "Bottles Restocked",
                    "Invoice Cost / Case",
                    "Product Total Cost",
                    "Transaction Grand Total",
                ],
            ];

            for (const txn of transactions) {
                const dateStr = txn.restockDate || "";
                const timeStr = txn.restockTime || "";
                const whName = txn.warehouseName || "";
                const grandTotal = txn.grandTotal ?? 0;

                for (let i = 0; i < txn.products.length; i++) {
                    const prod = txn.products[i];
                    const fullProdName = [
                        prod.productNameSnapshot,
                        prod.packSizeSnapshot && !prod.productNameSnapshot?.includes(prod.packSizeSnapshot) ? `(${prod.packSizeSnapshot})` : "",
                        prod.flavourSnapshot && !prod.productNameSnapshot?.includes(prod.flavourSnapshot) ? prod.flavourSnapshot : "",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    rows.push([
                        txn.transactionId,
                        dateStr,
                        timeStr,
                        whName,
                        fullProdName,
                        prod.casesRestocked ?? 0,
                        prod.bottlesRestocked ?? 0,
                        prod.invoiceCostPerCase ?? 0,
                        prod.totalCost ?? 0,
                        i === 0 ? grandTotal : "", // show grand total on first item row or every row
                    ]);
                }
            }

            const ws = XLSX.utils.aoa_to_sheet(rows);

            // Bold headers
            const headerAddrs = ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1", "J1"];
            headerAddrs.forEach((addr) => {
                if (ws[addr]) {
                    ws[addr].s = { font: { bold: true } };
                }
            });

            // Auto-size columns based on longest cell content
            const colWidths = rows.reduce<number[]>((acc, row) => {
                row.forEach((cell, i) => {
                    const len = String(cell ?? "").length;
                    acc[i] = Math.max(acc[i] ?? 12, len + 3);
                });
                return acc;
            }, []);
            ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w, 45) }));

            // Create workbook and write
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Restock History");

            // Format date for filename
            const today = new Date().toISOString().split("T")[0];
            const safeWhName = (warehouseName || "All_Warehouses").replace(/[^a-zA-Z0-9_-]/g, "_");
            const filename = `Restock_History_${safeWhName}_${today}.xlsx`;

            XLSX.writeFile(wb, filename);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000);
        } catch (err: any) {
            console.error("Export failed:", err);
            setError(err.message || "Failed to export Excel file");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleExport}
                disabled={loading}
                title="Export filtered restock history to Excel"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-sm font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Download className="w-4 h-4 text-emerald-600" />}
                <span>{loading ? "Exporting..." : "Export to Excel"}</span>
            </button>

            {/* Success toast */}
            {success && (
                <div className="absolute right-0 top-full mt-2 z-50 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 shadow-md whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Excel file exported successfully</span>
                    <button onClick={() => setSuccess(false)} className="ml-1 opacity-60 hover:opacity-100">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Error toast */}
            {error && (
                <div className="absolute right-0 top-full mt-2 z-50 flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive shadow-md whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-1 opacity-60 hover:opacity-100">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

