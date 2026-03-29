"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ImportResult {
    created: number;
    updated: number;
    errors: string[];
}

export default function StockExcelImport() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset state
        setResult(null);
        setError(null);
        setUploading(true);

        try {
            const form = new FormData();
            form.append("file", file);

            const res = await fetch("/api/products/import", {
                method: "POST",
                body: form,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Import failed");
            }

            setResult(data);
            // Refresh the page to show new products
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Failed to import file");
        } finally {
            setUploading(false);
            // Reset file input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
            />

            {/* Upload button */}
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-ruby-400 hover:text-ruby-700 hover:bg-ruby-50 transition-colors shadow-sm disabled:opacity-50"
                title="Upload Excel / CSV file to import stock"
            >
                {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Upload className="w-4 h-4" />
                )}
                {uploading ? "Importing..." : "Upload Excel"}
            </button>

            {/* Result toast */}
            {result && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 max-w-xs">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold">Import complete!</p>
                        <p>{result.created} added · {result.updated} updated</p>
                        {result.errors.length > 0 && (
                            <p className="text-orange-600 mt-1">{result.errors.length} row(s) skipped</p>
                        )}
                    </div>
                    <button onClick={() => setResult(null)} className="shrink-0 hover:opacity-60">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Error toast */}
            {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 max-w-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="shrink-0 hover:opacity-60">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Column guide hint */}
            <p className="text-xs text-gray-400 leading-relaxed">
                Excel columns: <span className="font-medium text-gray-500">Name, SKU, Flavour, Pack, Quantity, Invoice Cost, MRP, Sale Price, Today&apos;s Price</span>
            </p>
        </div>
    );
}
