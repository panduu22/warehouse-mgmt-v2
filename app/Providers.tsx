"use client";

import { SessionProvider } from "next-auth/react";
import { WarehouseProvider } from "@/components/WarehouseContext";
import { KeyboardNavigation } from "@/components/KeyboardNavigation";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SessionProvider>
                <WarehouseProvider>
                    <KeyboardNavigation />
                    {children}
                </WarehouseProvider>
            </SessionProvider>
        </ThemeProvider>
    );
}
