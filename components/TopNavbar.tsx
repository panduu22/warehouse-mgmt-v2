"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Sun, Moon, LogOut, ChevronRight } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { WarehouseSwitcher } from "./WarehouseSwitcher";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";
import { Sidebar } from "./Sidebar";
import clsx from "clsx";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/stock": "Stock Management",
    "/stock/add": "Add Stock",
    "/vehicles": "Vehicles",
    "/trips/new": "Load Vehicle",
    "/trips": "Trips & Verification",
    "/bills": "Invoices",
    "/admin/requests": "Access Requests",
    "/admin/activity": "Activity Log",
};

function getBreadcrumb(pathname: string): { parent?: string; parentHref?: string; current: string } {
    if (pathname.startsWith("/trips/") && pathname !== "/trips/new") return { parent: "Trips", parentHref: "/trips", current: "Trip Detail" };
    if (pathname.startsWith("/vehicles/")) return { parent: "Vehicles", parentHref: "/vehicles", current: "Vehicle Detail" };
    if (pathname.startsWith("/bills/")) return { parent: "Invoices", parentHref: "/bills", current: "Invoice Detail" };
    if (pathname.startsWith("/stock/add")) return { parent: "Stock", parentHref: "/stock", current: "Add Stock" };
    const match = Object.entries(PAGE_TITLES).find(([p]) => pathname === p || pathname.startsWith(p + "/"));
    return { current: match?.[1] ?? "Warehouse ERP" };
}

export function TopNavbar() {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const user = session?.user as any;
    const breadcrumb = getBreadcrumb(pathname);
    const initials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/90 backdrop-blur-xl px-4 md:px-6 shadow-erp">
            {/* Mobile: Menu + Logo */}
            <div className="md:hidden flex items-center gap-3 mr-auto">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger
                        render={
                            <button className="p-2 -ml-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
                                <Menu className="w-5 h-5" />
                            </button>
                        }
                    />
                    <SheetContent side="left" className="p-0 w-[260px]">
                        <div className="sr-only"><SheetTitle>Navigation</SheetTitle></div>
                        <div className="flex flex-col h-full overflow-y-auto">
                            <div className="h-16 px-4 border-b border-border flex items-center gap-3 shrink-0">
                                <div className="w-8 h-8 rounded-xl border border-border overflow-hidden relative shrink-0">
                                    <Image src="/adithyatech-emblem.png" alt="AdithyaTech" fill className="object-contain" priority />
                                </div>
                                <span className="font-black text-[13px] tracking-tight">
                                    ADITHYA<span className="text-primary">TECH</span>
                                </span>
                            </div>
                            <div className="flex-1" onClick={() => setMobileOpen(false)}>
                                <Sidebar isCollapsed={false} setIsCollapsed={() => {}} isMobile={true} />
                            </div>
                            <div className="p-4 border-t border-border space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Active Warehouse</p>
                                    <WarehouseSwitcher />
                                </div>
                                <button
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-all"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg border border-border overflow-hidden relative shrink-0">
                        <Image src="/adithyatech-emblem.png" alt="AdithyaTech" fill className="object-contain" priority />
                    </div>
                    <span className="font-black text-sm tracking-tight">
                        ADITHYA<span className="text-primary">TECH</span>
                    </span>
                </Link>
            </div>

            {/* Desktop: Breadcrumb */}
            <div className="hidden md:flex flex-1 items-center gap-2 min-w-0">
                {breadcrumb.parent ? (
                    <nav className="flex items-center gap-1.5 text-sm min-w-0">
                        <Link href={breadcrumb.parentHref!} className="text-muted-foreground hover:text-foreground transition-colors font-medium whitespace-nowrap">
                            {breadcrumb.parent}
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="font-semibold text-foreground truncate">{breadcrumb.current}</span>
                    </nav>
                ) : (
                    <h1 className="text-base font-semibold text-foreground tracking-tight">{breadcrumb.current}</h1>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 ml-auto">
                {/* Theme Toggle */}
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                    title="Toggle theme"
                >
                    {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </button>

                {/* Warehouse Switcher */}
                <div className="hidden md:block">
                    <WarehouseSwitcher />
                </div>

                {/* User avatar */}
                <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-border">
                    <div className="hidden md:flex flex-col text-right leading-none gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{user?.name?.split(" ")[0] || "User"}</span>
                        <span className="text-[11px] text-muted-foreground capitalize">{user?.role?.toLowerCase() || "staff"}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    );
}
