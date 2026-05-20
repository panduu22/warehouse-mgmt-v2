"use client";

import { useState } from "react";
import { Loader2, Check, X, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function BottlesPerPackEditor({ productId, initialBpp }: { productId: string, initialBpp: number }) {
    const [isEditing, setIsEditing] = useState(false);
    const [bpp, setBpp] = useState(initialBpp);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdate = async () => {
        if (bpp < 1) {
            alert("Bottles per pack must be at least 1");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bottlesPerPack: bpp })
            });

            if (!res.ok) throw new Error("Update failed");
            
            router.refresh();
            setIsEditing(false);
        } catch (e) {
            alert("Failed to update bottles per pack");
            setBpp(initialBpp);
        } finally {
            setLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={bpp}
                    onChange={(e) => setBpp(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-1.5 py-1 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background font-bold text-center text-xs"
                    autoFocus
                />
                <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="p-1 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/20 rounded"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                    onClick={() => { setIsEditing(false); setBpp(initialBpp); }}
                    className="p-1 text-muted-foreground hover:bg-muted rounded"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group justify-center md:justify-start">
            <span className="text-foreground font-black text-sm">
                {bpp}
            </span>
            <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-all opacity-0 group-hover:opacity-100"
            >
                <Edit2 className="w-3 h-3" />
            </button>
        </div>
    );
}
