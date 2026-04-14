"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useWarehouse } from "@/components/WarehouseContext";

export default function NewWarehousePage() {
    const router = useRouter();
    const { switchWarehouse } = useWarehouse();
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return alert("Warehouse name is required");

        setLoading(true);
        try {
            const res = await fetch("/api/warehouses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    address,
                    isMain: false // User creates subservient warehouses via UI normally
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create warehouse");
            }
            
            const data = await res.json();
            // Automatically switch context to the newly created warehouse
            if (data._id) {
                await switchWarehouse(data._id);
            }
            
            router.push("/dashboard"); 
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="p-3 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-primary active:scale-95 border border-transparent hover:border-border shadow-sm">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight italic">
                        <Building2 className="w-7 h-7 text-primary" />
                        Create Storage Unit
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">Deploy a new warehouse and sync inventory at zero stock.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-card p-10 rounded-[2rem] shadow-xl border border-border space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform"></div>
                
                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Warehouse Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground transition-all placeholder:text-muted-foreground/30 shadow-sm"
                        placeholder="e.g. North Zone Depot"
                        required
                    />
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 text-muted-foreground/80">Physical Address <span className="opacity-50 font-medium">(Optional)</span></label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-5 py-4 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground transition-all placeholder:text-muted-foreground/30 shadow-sm resize-none"
                        placeholder="123 Logistics Way..."
                        rows={3}
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading || !name}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 h-[60px] active:scale-95 text-lg"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                        Provision Warehouse
                    </button>
                    <p className="text-center text-[10px] text-amber-500 mt-6 font-black uppercase tracking-widest bg-amber-500/5 py-2 rounded-full border border-amber-500/10">
                        Initializes with core product catalog synced
                    </p>
                </div>
            </form>
        </div>
    );
}
