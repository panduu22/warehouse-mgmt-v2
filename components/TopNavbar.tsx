"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell, Sun, Moon, LogOut, Package } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { WarehouseSwitcher } from "./WarehouseSwitcher";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";
import { Sidebar } from "./Sidebar";

export function TopNavbar() {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const user = session?.user as any;

    const getPageTitle = () => {
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname.startsWith("/stock")) return "Stock Management";
        if (pathname.startsWith("/vehicles")) return "Vehicles";
        if (pathname.startsWith("/trips/new")) return "Vehicle Loading";
        if (pathname.startsWith("/trips")) return "Trips & Verification";
        if (pathname.startsWith("/bills")) return "Billing";
        if (pathname.startsWith("/admin")) return "Administration";
        return "RK Agencies";
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-4 md:px-8">
            <div className="md:hidden flex items-center gap-2 font-bold text-lg mr-auto">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger 
                        render={
                            <button className="p-2 -ml-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                <Menu className="w-6 h-6" />
                            </button>
                        }
                    />
                    <SheetContent side="left" className="p-0 w-[280px]">
                         {/* Visually hidden title for accessibility */}
                        <div className="sr-only"><SheetTitle>Menu</SheetTitle></div>
                        <div className="flex" onClick={() => setMobileOpen(false)}>
                            <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="p-1.5 bg-ruby-600 rounded-lg text-white ml-2">
                    <Package className="w-5 h-5" />
                </div>
                RK Agencies
            </div>

            <div className="hidden md:flex flex-1 items-center gap-4">
                <h1 className="text-xl font-bold tracking-tight text-foreground">{getPageTitle()}</h1>
            </div>

            <div className="flex items-center gap-4 ml-auto">
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors"
                >
                    {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                
                <div className="hidden md:block">
                    <WarehouseSwitcher />
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-border">
                    <div className="hidden md:flex flex-col text-right">
                        <span className="text-sm font-bold">{user?.name || "User"}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase() || "Role"}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
