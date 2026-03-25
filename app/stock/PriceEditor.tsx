"use client";

import { useState } from "react";
import { Loader2, Check, X, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function PriceEditor({ productId, initialPrice }: { productId: string, initialPrice: number }) {
    const [isEditing, setIsEditing] = useState(false);
    const [price, setPrice] = useState(initialPrice);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ price })
            });

            if (!res.ok) throw new Error("Update failed");
            
            router.refresh();
            setIsEditing(false);
        } catch (e) {
            alert("Failed to update price");
            setPrice(initialPrice);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                    <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-24 pl-5 pr-2 py-1 border border-ruby-300 rounded focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900 font-bold"
                        autoFocus
                    />
                </div>
                <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => { setIsEditing(false); setPrice(initialPrice); }}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group">
            <span className="text-gray-600 font-medium">
                {formatCurrency(price)}
            </span>
            <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-ruby-600 hover:bg-ruby-50 rounded transition-all"
            >
                <Edit2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
