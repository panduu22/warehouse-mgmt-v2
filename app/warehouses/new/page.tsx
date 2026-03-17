"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useWarehouse } from "@/components/WarehouseContext";

export default function NewWarehousePage() {
    const router = useRouter();
    const { fetchActiveWarehouse } = useWarehouse();
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
            
            // Re-fetch context so switcher logs it
            await fetchActiveWarehouse();
            
            router.push("/dashboard"); 
            router.refresh();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-12">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-ruby-600" />
                        Create Storage Unit
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Deploy a new warehouse and sync inventory at zero stock.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Warehouse Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900 transition-shadow bg-gray-50 focus:bg-white"
                        placeholder="e.g. North Zone Depot"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Physical Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900 transition-shadow bg-gray-50 focus:bg-white"
                        placeholder="123 Logistics Way..."
                        rows={3}
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading || !name}
                        className="w-full bg-ruby-700 hover:bg-ruby-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 h-[50px] disabled:shadow-none"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Create & Provision Warehouse
                    </button>
                    <p className="text-center text-xs text-amber-600 mt-4 font-medium uppercase tracking-widest hidden md:block">
                        This will automatically copy core product catalog
                    </p>
                </div>
            </form>
        </div>
    );
}
