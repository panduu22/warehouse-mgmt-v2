"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Loader2, Building2, Trash2 } from "lucide-react";
import { useWarehouse } from "./WarehouseContext";
import { useSession } from "next-auth/react";

export function WarehouseSwitcher() {
    const { activeWarehouse, switchWarehouse, loading: ctxLoading } = useWarehouse();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const [isOpen, setIsOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && warehouses.length === 0) {
            setLoading(true);
            fetch("/api/warehouses")
                .then(res => res.json())
                .then(data => {
                    setWarehouses(data);
                    setLoading(false);
                });
        }
    }, [isOpen]);

    const handleSwitch = (id: string) => {
        switchWarehouse(id);
        setIsOpen(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the warehouse "${name}"? ALL associated stock and history will be permanently deleted.`)) return;
        
        try {
            const res = await fetch(`/api/warehouses?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete");
            }
            // Remove from local list
            setWarehouses(warehouses.filter(w => w._id !== id));
            // If they deleted the active one, switch to main
            if (activeWarehouse?.id === id) {
                const main = warehouses.find(w => w.isMain);
                if (main) switchWarehouse(main._id);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors border border-gray-100"
            >
                {ctxLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                    <ArrowLeftRight className="w-5 h-5" />
                )}
                <div className="flex-1 truncate">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Storage Unit</div>
                    <div className="font-bold text-gray-800 truncate">{activeWarehouse?.name || "Loading..."}</div>
                </div>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-100 shadow-xl rounded-xl z-50 overflow-hidden transform animate-in slide-in-from-bottom-2">
                        <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Select Warehouse
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                            ) : (
                                warehouses.map(w => (
                                    <div key={w._id} className="relative group">
                                        <button
                                            onClick={() => handleSwitch(w._id)}
                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-ruby-50 transition-colors ${activeWarehouse?.id === w._id ? 'bg-ruby-50/50' : ''}`}
                                        >
                                        <Building2 className={`w-5 h-5 ${activeWarehouse?.id === w._id ? 'text-ruby-600' : 'text-gray-400'}`} />
                                            <div>
                                                <div className={`font-medium pr-8 ${activeWarehouse?.id === w._id ? 'text-ruby-900' : 'text-gray-900'}`}>{w.name}</div>
                                                {w.isMain && <div className="text-[10px] bg-ruby-100 text-ruby-700 px-2 py-0.5 rounded-full uppercase font-bold inline-block mt-1">Main API</div>}
                                            </div>
                                        </button>
                                        {userRole === "ADMIN" && !w.isMain && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(w._id, w.name); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Warehouse"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
