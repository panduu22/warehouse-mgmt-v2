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
        // 1. Initial Load: Check localStorage first for immediate UI feedback
        const savedWarehouse = localStorage.getItem("activeWarehouse");
        if (savedWarehouse) {
            try {
                setActiveWarehouse(JSON.parse(savedWarehouse));
            } catch (e) {
                console.error("Failed to parse saved warehouse from localStorage");
            }
        }

        // 2. Fetch ground truth from API/Cookies
        fetch("/api/warehouses/active")
            .then(res => res.json())
            .then(data => {
                if (data.activeWarehouseId) {
                    const active = { id: data.activeWarehouseId, name: data.activeWarehouseName };
                    setActiveWarehouse(active);
                    localStorage.setItem("activeWarehouse", JSON.stringify(active));
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
                const active = { id: data.activeWarehouseId, name: data.activeWarehouseName };
                setActiveWarehouse(active);
                localStorage.setItem("activeWarehouse", JSON.stringify(active));
                router.refresh(); // Reload server components to reflect warehouse change
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to switch warehouse", e);
            return false;
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
