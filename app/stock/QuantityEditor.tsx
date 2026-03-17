"use client";

import { useState } from "react";
import { Loader2, Check, X, Edit2 } from "lucide-react";

export function QuantityEditor({ productId, initialQuantity }: { productId: string, initialQuantity: number }) {
    const [isEditing, setIsEditing] = useState(false);
    const [quantity, setQuantity] = useState(initialQuantity);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity })
            });

            if (!res.ok) throw new Error("Update failed");
            
            setIsEditing(false);
        } catch (e) {
            alert("Failed to update quantity");
            setQuantity(initialQuantity);
        } finally {
            setLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 justify-end">
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-20 px-2 py-1 border border-ruby-300 rounded focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900 font-bold text-right"
                    autoFocus
                />
                <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => { setIsEditing(false); setQuantity(initialQuantity); }}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 justify-end group">
            <span
                className={
                    quantity < 10
                        ? "text-red-600 font-bold"
                        : quantity < 50
                            ? "text-amber-600 font-bold"
                            : "text-emerald-600 font-bold"
                }
            >
                {quantity}
            </span>
            <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-300 hover:text-ruby-600 hover:bg-ruby-50 rounded opacity-0 group-hover:opacity-100 transition-all"
            >
                <Edit2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
