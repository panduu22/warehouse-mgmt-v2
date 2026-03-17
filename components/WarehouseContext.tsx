"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WarehouseContext = createContext<any>(null);

export function WarehouseProvider({ children }: { children: React.ReactNode }) {
    const [activeWarehouse, setActiveWarehouse] = useState<{ id: string, name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Fetch initially
        fetch("/api/warehouses/active")
            .then(res => res.json())
            .then(data => {
                if (data.activeWarehouseId) {
                    setActiveWarehouse({ id: data.activeWarehouseId, name: data.activeWarehouseName });
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const switchWarehouse = async (warehouseId: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/warehouses/switch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ warehouseId })
            });

            if (res.ok) {
                const data = await res.json();
                setActiveWarehouse({ id: data.activeWarehouseId, name: data.activeWarehouseName });
                router.refresh(); // Reload server components
            }
        } catch (e) {
            console.error("Failed to switch warehouse", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <WarehouseContext.Provider value={{ activeWarehouse, switchWarehouse, loading }}>
            {children}
        </WarehouseContext.Provider>
    );
}

export const useWarehouse = () => useContext(WarehouseContext);
