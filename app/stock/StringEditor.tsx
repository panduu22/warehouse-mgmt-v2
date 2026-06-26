"use client";

import { useState } from "react";
import { Loader2, Check, X, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function StringEditor({ productId, initialValue, field }: { productId: string, initialValue: string, field: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue || "");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value })
            });

            if (!res.ok) throw new Error("Update failed");
            
            router.refresh();
            setIsEditing(false);
        } catch (e) {
            alert(`Failed to update ${field}`);
            setValue(initialValue || "");
        } finally {
            setLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-32 px-2 py-1 border border-ruby-300 rounded focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900 font-bold"
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
                    onClick={() => { setIsEditing(false); setValue(initialValue || ""); }}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group">
            <span className="text-gray-900 font-medium">
                {value || <span className="text-gray-400 italic">Empty</span>}
            </span>
            <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-ruby-600 hover:bg-ruby-50 rounded transition-all opacity-0 group-hover:opacity-100"
            >
                <Edit2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
