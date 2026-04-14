"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck, ClipboardCheck, Receipt, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import { WarehouseSwitcher } from "./WarehouseSwitcher";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stock Management", href: "/stock", icon: Package },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Vehicle Loading", href: "/trips/new", icon: ClipboardCheck },
    { name: "Trips & Verification", href: "/trips", icon: ClipboardCheck },
    { name: "Billing", href: "/bills", icon: Receipt },
];

export function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <div className="md:hidden">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-border h-16 flex items-center justify-between px-4 z-40 shadow-sm">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="p-1.5 bg-ruby-600 rounded-lg text-white group-hover:bg-ruby-700 transition-colors shadow-sm">
                        <Package className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-ruby-700 to-ruby-900 bg-clip-text text-transparent">
                        RK Agencies
                    </span>
                </Link>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-muted-foreground hover:bg-slate-100 hover:text-foreground rounded-xl transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[60] flex">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Sidebar Content */}
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl flex flex-col z-10"
                        >
                            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <div className="p-1.5 bg-ruby-600 rounded-md text-white">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    Menu
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-muted-foreground hover:bg-slate-200 hover:text-foreground rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <nav className="flex-1 overflow-y-auto p-4 space-y-1 relative">
                                {navItems.map((item) => {
                                    const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname === item.href || pathname.startsWith(item.href + "/");
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={clsx(
                                                "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                                                isActive
                                                    ? "text-ruby-700 bg-ruby-50"
                                                    : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className={clsx("w-5 h-5", isActive ? "text-ruby-600" : "text-muted-foreground")} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="p-4 border-t border-border/50 flex flex-col gap-2 bg-slate-50/50">
                                <WarehouseSwitcher />
                                <button
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors group"
                                >
                                    <LogOut className="w-5 h-5 group-hover:text-destructive transition-colors text-muted-foreground" />
                                    Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
