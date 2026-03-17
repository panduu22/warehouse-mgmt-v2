"use client";

import { SessionProvider } from "next-auth/react";
import { WarehouseProvider } from "@/components/WarehouseContext";
import { KeyboardNavigation } from "@/components/KeyboardNavigation";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <WarehouseProvider>
                <KeyboardNavigation />
                {children}
            </WarehouseProvider>
        </SessionProvider>
    );
}
