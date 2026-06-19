"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DeleteAllStockButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDeleteAll = async () => {
        if (!confirm("⚠️ WARNING: Are you completely sure you want to delete ALL stock in this warehouse? This action CANNOT be undone.")) {
            return;
        }

        const verification = prompt("Type 'DELETE ALL' to confirm:");
        if (verification !== "DELETE ALL") {
            alert("Verification failed. Stock deletion cancelled.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/products/delete-all`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to delete all stock");
            }

            const data = await res.json();
            alert(`Successfully deleted ${data.deletedCount} products.`);
            router.refresh(); 
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to delete all stock");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDeleteAll}
            disabled={loading}
            className={cn(buttonVariants({ variant: "destructive" }), "shadow-sm transition-all hover:scale-105 active:scale-95 gap-2")}
            title="Delete All Stock"
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            Delete All
        </button>
    );
}
