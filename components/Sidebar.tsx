"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck, ClipboardCheck, Receipt, LayoutDashboard, LogOut, ShieldAlert, History as HistoryIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import clsx from "clsx";
import { motion } from "framer-motion";

export const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stock Management", href: "/stock", icon: Package },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Vehicle Loading", href: "/trips/new", icon: ClipboardCheck },
    { name: "Trips & Verification", href: "/trips", icon: ClipboardCheck },
    { name: "Billing", href: "/bills", icon: Receipt },
];

export function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean; setIsCollapsed: (val: boolean) => void }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;

    return (
        <aside className={clsx("hidden md:flex bg-card border-r border-border h-screen flex-col fixed left-0 top-0 z-40 transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
            <div className="p-4 border-b border-border/50 h-16 flex items-center justify-between">
                {!isCollapsed && (
                    <Link href="/" className="flex items-center gap-3 group overflow-hidden">
                        <div className="p-1.5 bg-ruby-600 rounded-lg text-white group-hover:bg-ruby-700 transition-colors shadow-sm shrink-0">
                            <Package className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
                            RK Agencies
                        </h1>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="mx-auto p-1.5 bg-ruby-600 rounded-lg text-white shadow-sm shrink-0">
                        <Package className="w-5 h-5" />
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={clsx("p-1.5 rounded-full hover:bg-muted text-muted-foreground absolute -right-3 top-4 border bg-background shadow-sm")}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2 custom-scrollbar">
                <div className="space-y-1 relative">
                    {navItems.map((item) => {
                        const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.name : undefined}
                                className={clsx(
                                    "relative flex items-center gap-3 py-2.5 rounded-lg transition-all text-sm font-medium group overflow-hidden",
                                    isCollapsed ? "justify-center px-0" : "px-3",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {isActive && !isCollapsed && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                {isActive && isCollapsed && (
                                    <div className="absolute inset-0 bg-primary/10 rounded-lg -z-10" />
                                )}
                                <item.icon className={clsx("w-5 h-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                {!isCollapsed && <span className="relative z-10 whitespace-nowrap">{item.name}</span>}
                            </Link>
                        );
                    })}
                </div>

                {userRole === "ADMIN" && (
                    <div className="mt-8 pt-4 border-t border-border/50 space-y-1 relative">
                        {!isCollapsed && <p className="px-3 text-[10px] font-bold uppercase text-muted-foreground/70 tracking-widest mb-2 whitespace-nowrap">Administration</p>}
                        
                        <Link
                            href="/admin/requests"
                            title={isCollapsed ? "Access Requests" : undefined}
                            className={clsx(
                                "relative flex items-center gap-3 py-2.5 rounded-lg transition-all text-sm font-medium group overflow-hidden",
                                isCollapsed ? "justify-center px-0" : "px-3",
                                pathname.startsWith("/admin/requests")
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {pathname.startsWith("/admin/requests") && (
                                <div className="absolute inset-0 bg-primary/10 rounded-lg -z-10" />
                            )}
                            <ShieldAlert className={clsx("w-5 h-5 shrink-0", pathname.startsWith("/admin/requests") ? "text-primary" : "text-muted-foreground")} />
                            {!isCollapsed && <span className="relative z-10 whitespace-nowrap">Access Requests</span>}
                        </Link>
                        
                        <Link
                            href="/admin/activity"
                            title={isCollapsed ? "Activity History" : undefined}
                            className={clsx(
                                "relative flex items-center gap-3 py-2.5 rounded-lg transition-all text-sm font-medium group overflow-hidden",
                                isCollapsed ? "justify-center px-0" : "px-3",
                                pathname.startsWith("/admin/activity")
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {pathname.startsWith("/admin/activity") && (
                                <div className="absolute inset-0 bg-primary/10 rounded-lg -z-10" />
                            )}
                            <HistoryIcon className={clsx("w-5 h-5 shrink-0", pathname.startsWith("/admin/activity") ? "text-primary" : "text-muted-foreground")} />
                            {!isCollapsed && <span className="relative z-10 whitespace-nowrap">Activity History</span>}
                        </Link>
                    </div>
                )}
            </nav>

            <div className="p-3 border-t border-border/50 flex flex-col gap-2">
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    title={isCollapsed ? "Sign Out" : undefined}
                    className={clsx(
                        "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group",
                        isCollapsed ? "justify-center px-0" : "px-3"
                    )}
                >
                    <LogOut className="w-5 h-5 shrink-0 group-hover:text-destructive transition-colors text-muted-foreground" />
                    {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
