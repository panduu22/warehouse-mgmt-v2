"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck, ClipboardCheck, Receipt, LayoutDashboard, LogOut, Building2 } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Stock Management", href: "/stock", icon: Package },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Vehicle Loading", href: "/trips/new", icon: ClipboardCheck },
    { name: "Trips & Verification", href: "/trips", icon: ClipboardCheck },
    { name: "Billing", href: "/bills", icon: Receipt },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 h-screen flex-col sticky top-0 flex-shrink-0 z-40">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-ruby-700 flex items-center gap-2">
                    <Package className="w-8 h-8" />
                    WMS
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium whitespace-nowrap",
                                isActive
                                    ? "bg-ruby-50 text-ruby-700"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5 flex-shrink-0", isActive ? "text-ruby-700" : "text-gray-400")} />
                            <span className="truncate">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 space-y-2">
                <Link
                    href="/select-org"
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                >
                    <Building2 className="w-5 h-5" />
                    Switch Warehouse
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
