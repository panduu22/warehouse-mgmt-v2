"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
    Package, Truck, ClipboardCheck, Receipt, LayoutDashboard, LogOut, 
    ShieldAlert, History as HistoryIcon, ChevronLeft, ChevronRight,
    Gauge, BarChart3, Users
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import clsx from "clsx";
import { motion } from "framer-motion";

export const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Gauge, section: "main" },
    { name: "Stock Management", href: "/stock", icon: Package, section: "main" },
    { name: "Vehicles", href: "/vehicles", icon: Truck, section: "main" },
    { name: "Daily Accounts", href: "/daily-accounts", icon: BarChart3, section: "main" },
    { name: "Load Vehicle", href: "/trips/new", icon: ClipboardCheck, section: "operations" },
    { name: "Trips & Verify", href: "/trips", icon: ClipboardCheck, section: "operations" },
    { name: "Invoices", href: "/bills", icon: Receipt, section: "operations" },
];

const sections = [
    { key: "main", label: "Overview" },
    { key: "operations", label: "Operations" },
];

function NavLink({ item, isActive, isCollapsed }: { item: typeof navItems[0]; isActive: boolean; isCollapsed: boolean }) {
    return (
        <Link
            href={item.href}
            title={isCollapsed ? item.name : undefined}
            className={clsx(
                "relative flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group",
                isCollapsed ? "justify-center px-0 mx-1" : "px-3.5",
                isActive
                    ? "text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
            )}
            <item.icon className={clsx(
                "shrink-0 transition-all duration-200",
                isCollapsed ? "w-5 h-5" : "w-4.5 h-4.5",
                isActive ? "text-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
            )} />
            {!isCollapsed && (
                <span className="relative z-10 whitespace-nowrap font-medium tracking-tight">{item.name}</span>
            )}
        </Link>
    );
}

export function Sidebar({ isCollapsed, setIsCollapsed, isMobile }: { isCollapsed: boolean; setIsCollapsed: (val: boolean) => void; isMobile?: boolean }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;

    const isActive = (href: string) =>
        href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname.startsWith(href + "/");

    return (
        <aside className={clsx(
            "flex-col bg-sidebar transition-all duration-300 ease-in-out",
            isMobile
                ? "flex w-full"
                : "hidden md:flex border-r border-sidebar-border h-screen fixed left-0 top-0 z-40",
            !isMobile && (isCollapsed ? "w-[72px]" : "w-[240px]")
        )}>
            {/* Header */}
            {!isMobile && (
                <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border relative shrink-0">
                    {!isCollapsed ? (
                        <Link href="/" className="flex items-center gap-2.5 group overflow-hidden">
                            <div className="w-8 h-8 rounded-xl border border-border overflow-hidden relative shrink-0 shadow-sm">
                                <Image
                                    src="/adithyatech-emblem.png"
                                    alt="AdithyaTech"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[13px] font-black tracking-tight text-sidebar-foreground leading-none">
                                    ADITHYA<span className="text-primary">TECH</span>
                                </p>
                                <p className="text-[10px] text-sidebar-foreground/40 font-medium mt-0.5 uppercase tracking-widest">Warehouse ERP</p>
                            </div>
                        </Link>
                    ) : (
                        <Link href="/" className="mx-auto">
                            <div className="w-8 h-8 rounded-xl border border-border overflow-hidden relative shadow-sm">
                                <Image src="/adithyatech-emblem.png" alt="AdithyaTech" fill className="object-contain" priority />
                            </div>
                        </Link>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-card border border-border rounded-full flex items-center justify-center shadow-erp hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <nav className={clsx("flex-1 overflow-y-auto custom-scrollbar py-3", isCollapsed ? "px-1.5" : "px-3")}>
                {sections.map((section, si) => {
                    const sectionItems = navItems.filter(i => i.section === section.key);
                    return (
                        <div key={section.key} className={clsx(si > 0 && "mt-5 pt-5 border-t border-sidebar-border/60")}>
                            {!isCollapsed && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35 px-3.5 mb-2">
                                    {section.label}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {sectionItems.map(item => (
                                    <NavLink key={item.href} item={item} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Admin Section — visible to SUPER_ADMIN and WAREHOUSE_ADMIN */}
                {(userRole === "SUPER_ADMIN" || userRole === "WAREHOUSE_ADMIN") && (
                    <div className="mt-5 pt-5 border-t border-sidebar-border/60">
                        {!isCollapsed && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35 px-3.5 mb-2">
                                Management
                            </p>
                        )}
                        <div className="space-y-0.5">
                            {/* Staff — visible to SUPER_ADMIN and WAREHOUSE_ADMIN */}
                            <NavLink
                                key="/staff"
                                item={{ name: "Staff", href: "/staff", icon: Users, section: "admin" }}
                                isActive={isActive("/staff")}
                                isCollapsed={isCollapsed}
                            />
                            {/* Admin-only items */}
                            {userRole === "SUPER_ADMIN" && [
                                { name: "Access Requests", href: "/admin/requests", icon: ShieldAlert },
                                { name: "Activity Log", href: "/admin/activity", icon: HistoryIcon },
                            ].map(item => (
                                <NavLink key={item.href} item={{ ...item, section: "admin" }} isActive={isActive(item.href)} isCollapsed={isCollapsed} />
                            ))}
                        </div>
                    </div>
                )}
            </nav>

            {/* Footer */}
            {!isMobile && (
                <div className={clsx("py-3 border-t border-sidebar-border/60 shrink-0", isCollapsed ? "px-1.5" : "px-3")}>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        title={isCollapsed ? "Sign Out" : undefined}
                        className={clsx(
                            "w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/60 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 transition-all duration-200 group",
                            isCollapsed ? "justify-center px-0" : "px-3.5"
                        )}
                    >
                        <LogOut className="w-4.5 h-4.5 shrink-0 group-hover:text-rose-500 transition-colors" />
                        {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
                    </button>
                </div>
            )}
        </aside>
    );
}
