"use client";

import { SessionProvider } from "next-auth/react";
import { WarehouseProvider } from "@/components/WarehouseContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <WarehouseProvider>
                {children}
            </WarehouseProvider>
        </SessionProvider>
    );
}
