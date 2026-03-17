"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Loader2, Building2 } from "lucide-react";
import { useWarehouse } from "./WarehouseContext";

export function WarehouseSwitcher() {
    const { activeWarehouse, switchWarehouse, loading: ctxLoading } = useWarehouse();
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
                                    <button
                                        key={w._id}
                                        onClick={() => handleSwitch(w._id)}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-ruby-50 transition-colors ${activeWarehouse?.id === w._id ? 'bg-ruby-50/50' : ''}`}
                                    >
                                        <Building2 className={`w-5 h-5 ${activeWarehouse?.id === w._id ? 'text-ruby-600' : 'text-gray-400'}`} />
                                        <div>
                                            <div className={`font-medium ${activeWarehouse?.id === w._id ? 'text-ruby-900' : 'text-gray-900'}`}>{w.name}</div>
                                            {w.isMain && <div className="text-[10px] bg-ruby-100 text-ruby-700 px-2 py-0.5 rounded-full uppercase font-bold inline-block mt-1">Main API</div>}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
