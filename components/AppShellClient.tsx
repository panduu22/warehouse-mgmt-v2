"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import clsx from "clsx";

export function AppShellClient({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Desktop Sidebar (pass state down) */}
            <div className="hidden md:block">
               <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            </div>

            {/* Main Content Area */}
            <div className={clsx("flex-1 flex flex-col transition-all duration-300 min-w-0", isCollapsed ? "md:ml-20" : "md:ml-64")}>
                <TopNavbar />
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
