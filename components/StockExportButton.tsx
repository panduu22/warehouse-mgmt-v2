"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";

export default function StockExportButton() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        setLoading(true);
        setSuccess(false);
        setError(null);

        try {
            const res = await fetch("/api/products/export");

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error || "Failed to fetch stock data");
            }

            const data: { warehouseName: string; products: { pack: string; flavour: string; quantity: string }[] } =
                await res.json();

            if (!data.products || data.products.length === 0) {
                setError("No stock data available to export.");
                setLoading(false);
                return;
            }

            // Dynamically import xlsx so it is only loaded when needed (keeps bundle small)
            const XLSX = await import("xlsx");

            // Build worksheet rows
            const rows = [
                ["Pack", "Flavour", "Quantity"], // header row
                ...data.products.map((p) => [p.pack, p.flavour, p.quantity]),
            ];

            const ws = XLSX.utils.aoa_to_sheet(rows);

            // Bold the header row by applying a style to each header cell
            const headerCells = ["A1", "B1", "C1"];
            headerCells.forEach((addr) => {
                if (!ws[addr]) return;
                ws[addr].s = { font: { bold: true } };
            });

            // Auto-size columns based on the widest value in each column
            const colWidths = rows.reduce<number[]>((acc, row) => {
                row.forEach((cell, i) => {
                    const len = String(cell ?? "").length;
                    acc[i] = Math.max(acc[i] ?? 10, len + 2);
                });
                return acc;
            }, []);
            ws["!cols"] = colWidths.map((w) => ({ wch: w }));

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Stock Report");

            // Sanitize warehouse name for a safe filename
            const safeName = data.warehouseName
                .replace(/[^a-zA-Z0-9_\- ]/g, "")
                .trim()
                .replace(/\s+/g, "_");

            const filename = `Stock_Report_${safeName || "Warehouse"}.xlsx`;

            XLSX.writeFile(wb, filename);

            setSuccess(true);
            // Auto-dismiss success message after 4 seconds
            setTimeout(() => setSuccess(false), 4000);
        } catch (err: any) {
            console.error("Export failed:", err);
            setError(err.message || "Export failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={handleExport}
                disabled={loading}
                aria-label="Export stock report as Excel file"
                title="Export stock report as Excel file"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                {loading ? "Exporting..." : "Export Report"}
            </button>

            {/* Success toast */}
            {success && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 max-w-xs">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="flex-1">Stock report exported successfully.</span>
                    <button onClick={() => setSuccess(false)} className="shrink-0 hover:opacity-60" aria-label="Dismiss">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Error toast */}
            {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 max-w-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="shrink-0 hover:opacity-60" aria-label="Dismiss">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
