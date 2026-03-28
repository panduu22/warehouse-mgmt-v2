"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck, ClipboardCheck, Receipt, LayoutDashboard, LogOut, ShieldAlert, History as HistoryIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import clsx from "clsx";
import { WarehouseSwitcher } from "./WarehouseSwitcher";

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
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;

    return (
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 h-screen flex-col fixed left-0 top-0 shadow-sm z-40">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-ruby-700 flex items-center gap-2">
                    <Package className="w-8 h-8" />
                    WMS
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                                    isActive
                                        ? "bg-ruby-50 text-ruby-700"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={clsx("w-5 h-5", isActive ? "text-ruby-700" : "text-gray-400")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {userRole === "ADMIN" && (
                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-1">
                        <p className="px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Administration</p>
                        <Link
                            href="/admin/requests"
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                                pathname.startsWith("/admin/requests")
                                    ? "bg-ruby-50 text-ruby-700 font-bold"
                                    : "text-gray-600 hover:bg-ruby-50 hover:text-ruby-700"
                            )}
                        >
                            <ShieldAlert className={clsx("w-5 h-5", pathname.startsWith("/admin/requests") ? "text-ruby-700" : "text-gray-400")} />
                            Access Requests
                        </Link>
                        <Link
                            href="/admin/activity"
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                                pathname.startsWith("/admin/activity")
                                    ? "bg-ruby-50 text-ruby-700 font-bold"
                                    : "text-gray-600 hover:bg-ruby-50 hover:text-ruby-700"
                            )}
                        >
                            <HistoryIcon className={clsx("w-5 h-5", pathname.startsWith("/admin/activity") ? "text-ruby-700" : "text-gray-400")} />
                            Activity History
                        </Link>
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
                <WarehouseSwitcher />
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
