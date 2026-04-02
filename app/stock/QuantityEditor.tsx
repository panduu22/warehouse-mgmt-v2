"use client";

import { useState } from "react";
import { Loader2, Check, X, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toBottles, formatPacksAndBottles } from "@/lib/stock-utils";

export function QuantityEditor({ 
    productId, 
    initialQuantity, 
    bottlesPerPack 
}: { 
    productId: string; 
    initialQuantity: number;
    bottlesPerPack: number;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [packs, setPacks] = useState(String(Math.floor(initialQuantity / bottlesPerPack)));
    const [bottles, setBottles] = useState(String(initialQuantity % bottlesPerPack));
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const totalBottles = (parseInt(packs || "0", 10) * bottlesPerPack) + parseInt(bottles || "0", 10);
            const res = await fetch(`/api/products/${productId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity: totalBottles })
            });

            if (!res.ok) throw new Error("Update failed");
            
            router.refresh();
            setIsEditing(false);
        } catch (e) {
            alert("Failed to update quantity");
            setPacks(String(Math.floor(initialQuantity / bottlesPerPack)));
            setBottles(String(initialQuantity % bottlesPerPack));
        } finally {
            setLoading(false);
        }
    };

    const handleBottleChange = (val: string) => {
        const b = parseInt(val, 10);
        if (!isNaN(b) && b >= bottlesPerPack) {
            const extraPacks = Math.floor(b / bottlesPerPack);
            const remBottles = b % bottlesPerPack;
            setPacks(prev => String(parseInt(prev || "0", 10) + extraPacks));
            setBottles(String(remBottles));
        } else {
            setBottles(val);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 justify-end">
                <input
                    type="number"
                    value={packs}
                    onChange={(e) => setPacks(e.target.value)}
                    className="w-12 px-1.5 py-1 border-2 border-ruby-200 rounded-lg focus:border-ruby-500 focus:ring-0 text-gray-900 font-bold text-center text-xs"
                    autoFocus
                    placeholder="P"
                />
                <span className="text-gray-300 font-bold text-xs">+</span>
                <input
                    type="number"
                    value={bottles}
                    onChange={(e) => handleBottleChange(e.target.value)}
                    className="w-12 px-1.5 py-1 border-2 border-ruby-200 rounded-lg focus:border-ruby-500 focus:ring-0 text-gray-900 font-bold text-center text-xs"
                    placeholder="B"
                />
                <div className="flex gap-1 ml-1">
                    <button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        onClick={() => { 
                            setIsEditing(false); 
                            setPacks(String(Math.floor(initialQuantity / bottlesPerPack)));
                            setBottles(String(initialQuantity % bottlesPerPack));
                        }}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 justify-end group">
            <span
                className={
                    initialQuantity < bottlesPerPack
                        ? "text-red-600 font-black"
                        : initialQuantity < bottlesPerPack * 2
                            ? "text-amber-600 font-black"
                            : "text-emerald-600 font-black"
                }
            >
                {Math.floor(initialQuantity / bottlesPerPack)}P + {initialQuantity % bottlesPerPack}B
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
